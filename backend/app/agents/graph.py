from typing import Any, Dict, List, Optional, Literal
import uuid
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from loguru import logger

from app.agents.state import CertificacionState
from app.services.privacy_service import PrivacyService
from app.services.llm_service import LLMService
from app.rag.rag_service import RAGService
from app.services.extraction_service import ExtractorService # Usando el servicio unificado
from app.core.database import AsyncSessionLocal
from app.models.schemas import TipoDocumentoCertificar

# ============================================================
# NODOS DEL GRAFO (Agentes de Grado Empresarial)
# ============================================================

def node_ofuscar(state: CertificacionState) -> dict:
    """Nodo Privacy: Anonimización de PII antes de subir al LLM."""
    logger.info("[Agente Privacy] Iniciando ofuscación de datos...")
    privacy_svc = PrivacyService()
    
    texto_input = ""
    if state["messages"]:
        texto_input = state["messages"][-1].content
    
    # Anonimizar el contenido para proteger la privacidad notarial
    res = privacy_svc.anonymize_payload({"input": texto_input})
    
    return {
        "datos_ofuscados": res["anonymized_data"],
        "mapa_inversion": res["anonymizer_result"],
        "intentos": 0,
        "aprobado": False
    }

async def node_extractor_erp(state: CertificacionState) -> dict:
    """Nodo ERP: Persistencia Multi-Tenant de entidades extraídas."""
    logger.info("[Agente ERP] Ejecutando Data Entry Automatizado...")
    extractor = ExtractorService()
    
    texto_crudo = state["messages"][-1].content if state["messages"] else ""
    tenant_id = state.get("tenant_id") or uuid.uuid4() # Fallback a nuevo tenant si no existe
    
    async with AsyncSessionLocal() as db:
        # El extractor guarda en las nuevas tablas de la Fase 1
        res = await extractor.procesar_y_persistir(
            texto=texto_crudo, 
            db=db, 
            tenant_id=tenant_id
        )
    
    return {
        "datos_extraidos": res,
        "tramite_id": res.get("tramite_id"),
        "tenant_id": tenant_id
    }

def node_buscar_rag(state: CertificacionState) -> dict:
    """Nodo RAG: Recuperación de normativa con filtro de jurisdicción."""
    logger.info(f"[Agente RAG] Consultando base de conocimientos...")
    rag_svc = RAGService()
    
    # Query basado en el último mensaje de usuario
    query = state["messages"][-1].content if state["messages"] else "normativa"
    
    # Buscamos contexto legal relevante (filtrado por metadatos en RAGService)
    contexto = rag_svc.buscar_contexto(query=query, n_resultados=3)
    
    return {"contexto_legal": contexto}

async def node_redactar(state: CertificacionState) -> dict:
    """Nodo Redactor: Generación del borrador notarial (Ofuscado)."""
    logger.info(f"[Agente Redactor] Generando borrador AI (Turno {state['intentos'] + 1})...")
    llm_svc = LLMService()
    
    # Combinamos contexto legal con feedback del validador si existe
    contexto_enriquecido = state.get("contexto_legal", "")
    if state.get("feedback_legal"):
        contexto_enriquecido += f"\n\n[AJUSTE REQUERIDO POR VALIDADOR]: {state['feedback_legal']}"
    
    borrador = await llm_svc.generar_certificacion(
        datos_ofuscados=state["datos_ofuscados"],
        tipo_certificacion=TipoDocumentoCertificar.FIRMA, # Extensible
        contexto_legal=contexto_enriquecido
    )
    
    return {
        "texto_generado": borrador,
        "intentos": state["intentos"] + 1
    }

async def node_validar_legalidad(state: CertificacionState) -> dict:
    """Nodo Validador: Verificación de cumplimiento normativo (Anti-Alucinación)."""
    logger.info("[Agente Validador] Auditando borrador generado...")
    
    # Lógica de validación: Buscamos cláusulas obligatorias
    texto = state["texto_generado"].upper()
    criticas = []
    
    if "DOY FE" not in texto:
        criticas.append("Falta cláusula obligatoria de cierre 'DOY FE'.")
    if "CERTIFICO" not in texto:
        criticas.append("Falta el encabezado de certificación.")
        
    if criticas and state["intentos"] < 3:
        logger.warning(f"[Agente Validador] Errores encontrados: {criticas}")
        return {
            "aprobado": False,
            "feedback_legal": " ".join(criticas)
        }
    
    logger.info("[Agente Validador] Documento aprobado.")
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
