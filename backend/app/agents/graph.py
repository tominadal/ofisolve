from typing import Any, Dict, List, Optional, Literal
import uuid
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from loguru import logger
from sqlalchemy import select

from app.agents.state import CertificacionState
from app.services.privacy_service import PrivacyService
from app.services.llm_service import LLMService
from app.services.document_service import DocumentService
from app.rag.rag_service import RAGService
from app.services.extraction_service import ExtractorService
from app.core.database import AsyncSessionLocal
from app.models.schemas import TipoDocumentoCertificar

# ==================================================================
# Singletons — servicios pesados se crean una única vez por proceso
# ==================================================================
_rag_service_singleton: RAGService | None = None

def _get_rag_singleton() -> RAGService:
    global _rag_service_singleton
    if _rag_service_singleton is None:
        _rag_service_singleton = RAGService()
    return _rag_service_singleton

# ============================================================
# NODOS DEL GRAFO (Agentes de Grado Empresarial)
# ============================================================

def node_ofuscar(state: CertificacionState) -> dict:
    """Nodo Privacy: Anonimización de PII antes de subir al LLM."""
    logger.info("[Agente Privacy] Iniciando ofuscación de datos...")
    privacy_svc = PrivacyService()
    
    # Extraer texto del último mensaje de forma segura
    texto_input = ""
    if state.get("messages"):
        last_msg = state["messages"][-1]
        texto_input = last_msg.content if hasattr(last_msg, 'content') else str(last_msg)
    
    # Anonimizar el contenido para proteger la privacidad notarial
    # Si hay error en anonimización, continuar con mapa vacío (no bloquear el chat)
    try:
        ofuscado, mapa = privacy_svc.anonymize_payload({"input": texto_input})
    except Exception as e:
        logger.warning(f"[Agente Privacy] Error en anonimización (no crítico): {e}")
        ofuscado = {"input": texto_input}
        mapa = {}
    
    return {
        "datos_ofuscados": ofuscado,
        "mapa_inversion": mapa,
        "intentos": 0,
        "aprobado": False
    }

async def node_extractor_erp(state: CertificacionState) -> dict:
    """Nodo ERP: Persistencia Multi-Tenant de entidades extraídas."""
    logger.info("[Agente ERP] Ejecutando Data Entry Automatizado...")
    extractor = ExtractorService()
    
    texto_crudo = state["messages"][-1].content if state["messages"] else ""
    # En modo soberano, el tenant_id es el workspace_id (int)
    tenant_id_raw = state.get("tenant_id", 1)
    try:
        workspace_id = int(tenant_id_raw)
    except:
        workspace_id = 1 # Fallback a workspace default
    
    async with AsyncSessionLocal() as db:
        # El extractor guarda en las nuevas tablas de la Fase 1
        res = await extractor.procesar_y_persistir(
            texto=texto_crudo, 
            db=db, 
            workspace_id=workspace_id
        )
    
    return {
        "datos_extraidos": res,
        "tramite_id": res.get("tramite_id"),
        "workspace_id": workspace_id
    }

async def node_buscar_rag(state: CertificacionState) -> dict:
    """Nodo RAG & Biblioteca: Recuperación de normativa y documentos locales."""
    logger.info(f"[Agente RAG] Consultando base de conocimientos y biblioteca local...")
    # Usar singleton para evitar reinicializar ChromaDB en cada petición
    rag_svc = _get_rag_singleton()
    doc_svc = DocumentService()
    
    # query basado en el último mensaje de usuario
    query = state["messages"][-1].content if state["messages"] else "normativa"
    
    # 1. Búsqueda en RAG (Normativa General)
    contexto_legal = await rag_svc.buscar_contexto(query=query, n_resultados=3)
    
    # 2. Búsqueda en Biblioteca Local (Documentos específicos del cliente)
    # Si tenemos el trámite_id o cliente_id en el estado, buscamos sus archivos
    info_biblioteca = ""
    async with AsyncSessionLocal() as db:
        if state.get("tramite_id"):
            from app.models.db_models import DocumentoLibreria
            stmt = select(DocumentoLibreria).where(DocumentoLibreria.tramite_id == state["tramite_id"])
            res = await db.execute(stmt)
            docs = res.scalars().all()
            if docs:
                p_names = [f"- {d.nombre} ({d.tipo})" for d in docs]
                info_biblioteca = "\nDOCUMENTOS DISPONIBLES EN ESTA CARPETA:\n" + "\n".join(p_names)
                logger.info(f"[Agente RAG] Encontrados {len(docs)} documentos en la biblioteca local.")

    return {"contexto_legal": contexto_legal + "\n" + info_biblioteca}

async def node_redactar(state: CertificacionState) -> dict:
    """Nodo Redactor: Generación de respuesta conversacional con contexto legal."""
    logger.info(f"[Agente Redactor] Generando respuesta AI (Turno {state['intentos'] + 1})...")
    llm_svc = LLMService()
    
    # Combinamos contexto legal con feedback del validador si existe
    contexto_enriquecido = state.get("contexto_legal", "")
    if state.get("feedback_legal"):
        contexto_enriquecido += f"\n\n[AJUSTE REQUERIDO POR VALIDADOR]: {state['feedback_legal']}"
    
    # Extraer query del usuario y history de los messages
    query = state["messages"][-1].content if state["messages"] else ""
    history = []
    for msg in state["messages"][:-1]:
        if hasattr(msg, 'type'):
            role = "user" if msg.type == "human" else "assistant"
        else:
            role = "user"
        history.append({"role": role, "content": msg.content})
    
    borrador = await llm_svc.chat(
        query=query,
        history=history,
        contexto_legal=contexto_enriquecido,
        tags=["chat_stream"]
    )
    
    return {
        "texto_generado": borrador,
        "intentos": state["intentos"] + 1
    }

async def node_validar_legalidad(state: CertificacionState) -> dict:
    """Nodo Validador: Verificación de cumplimiento normativo (Multi-Agente)."""
    logger.info("[Agente Validador] Auditando borrador generado con IA...")
    
    texto = state["texto_generado"].upper()
    
    # Solo validar cláusulas formales si la respuesta parece un documento notarial
    es_documento_formal = any(kw in texto for kw in ["COMPARECE", "ESCRIBANO", "ESCRIBANÍA", "ACTA", "ESCRITURA", "DOY FE", "CERTIFICO"])
    
    # Si no es documento formal (es chat libre), aprobar directamente sin loop
    if not es_documento_formal:
        logger.info("[Agente Validador] Respuesta conversacional — aprobada directamente.")
        return {"aprobado": True, "feedback_legal": None}

    llm_svc = LLMService()
    resultado = await llm_svc.validar_documento(state["texto_generado"])
    
    criticas = resultado.get("criticas", [])
    
    if not resultado.get("aprobado") and state["intentos"] < 3:  # Máximo 3 reintentos para no colgar
        logger.warning(f"[Agente Validador] Errores encontrados: {criticas}")
        return {
            "aprobado": False,
            "feedback_legal": " ".join(criticas)
        }
    
    logger.info("[Agente Validador] Borrador aprobado exitosamente por IA Revisor.")
    return {"aprobado": True, "feedback_legal": None}

def node_desofuscar(state: CertificacionState) -> dict:
    """Nodo Privacy: Recomposición final con datos reales (Solo local)."""
    logger.info("[Agente Privacy] Reconstruyendo documento con PII real...")
    privacy_svc = PrivacyService()
    
    texto_vincular = privacy_svc.deanonymize_text(
        state["texto_generado"],
        state["mapa_inversion"]
    )
    
    return {"texto_final": texto_vincular}

# ============================================================
# ORQUESTACIÓN Y COMPILACIÓN
# ============================================================

def routing_decision(state: CertificacionState) -> Literal["redactar", "desofuscar"]:
    """Control de flujo cíclico."""
    if state["aprobado"]:
        return "desofuscar"
    return "redactar"

def create_advanced_graph():
    """Compila el grafo de grado empresarial con persistencia."""
    workflow = StateGraph(CertificacionState)
    
    # Registro de Agentes
    workflow.add_node("ofuscar", node_ofuscar)
    workflow.add_node("extractor_erp", node_extractor_erp)
    workflow.add_node("buscar_rag", node_buscar_rag)
    workflow.add_node("redactar", node_redactar)
    workflow.add_node("validar_legalidad", node_validar_legalidad)
    workflow.add_node("desofuscar", node_desofuscar)
    
    # Secuencia lógica
    workflow.set_entry_point("ofuscar")
    workflow.add_edge("ofuscar", "extractor_erp")
    workflow.add_edge("extractor_erp", "buscar_rag")
    workflow.add_edge("buscar_rag", "redactar")
    workflow.add_edge("redactar", "validar_legalidad")
    
    # Ciclo de Calidad (Looping)
    workflow.add_conditional_edges(
        "validar_legalidad",
        routing_decision
    )
    
    # Salida
    workflow.add_edge("desofuscar", END)
    
    # Persistencia de Memoria por thread_id
    checkpointer = MemorySaver()
    
    # Compilación con límites de seguridad
    return workflow.compile(
        checkpointer=checkpointer,
    )

# Instancia global del sistema
ofisolve_graph = create_advanced_graph()
