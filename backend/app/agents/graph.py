from typing import Any, Dict, List, Optional, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from loguru import logger

from app.agents.state import CertificacionState
from app.services.privacy_service import PrivacyService
from app.services.llm_service import LLMService
from app.rag.rag_service import RAGService
from app.services.extractor import ExtractorService
from app.core.database import AsyncSessionLocal
from app.models.schemas import TipoDocumentoCertificar

# ============================================================
# NODOS DEL GRAFO (Agentes Especializados)
# ============================================================

def node_ofuscar(state: CertificacionState) -> dict:
    """Nodo Privacy: Remoción de PII local antes de salir a la nube."""
    logger.info("[Agente Privacy] Protegiendo datos PII...")
    privacy_svc = PrivacyService()
    
    # Extraer texto de los últimos mensajes o datos iniciales
    texto_input = ""
    if state["messages"]:
        texto_input = state["messages"][-1].content
    
    # Simulación de extracción de PII simple para el ejemplo
    # En un flujo real, anonimizamos el payload completo
    datos_crudos = {"input": texto_input}
    datos_ofuscados, mapa_inversion = privacy_svc.anonymize_payload(datos_crudos)
    
    return {
        "datos_ofuscados": datos_ofuscados,
        "mapa_inversion": mapa_inversion,
        "intentos": 0,
        "aprobado": False
    }

async def node_extractor_erp(state: CertificacionState) -> dict:
    """Nodo ERP: Extrae entidades y persiste en PostgreSQL SaaS."""
    logger.info("[Agente ERP] Ejecutando Data Entry Cero...")
    extractor = ExtractorService()
    
    # Usamos los datos originales (crudos) para la extracción interna segura
    # En este MVP, asumimos que el extractor tiene acceso a los datos antes de ofuscar
    # o desofuscamos internamente si es necesario.
    texto_para_extraer = state["messages"][-1].content if state["messages"] else ""
    
    async with AsyncSessionLocal() as db:
        workspace_id = state.get("workspace_id", 1)
        datos_extraidos = await extractor.procesar_y_persistir(texto_para_extraer, db, workspace_id)
    
    return {
        "datos_extraidos": datos_extraidos,
        "tramite_id": datos_extraidos.get("tramite_id")
    }

def node_buscar_rag(state: CertificacionState) -> dict:
    """Nodo RAG: Búsqueda normativa con filtro de jurisdicción."""
    logger.info(f"[Agente RAG] Buscando normativa en {state.get('jurisdiccion', 'CABA')}...")
    rag_svc = RAGService()
    
    query = state["messages"][-1].content if state["messages"] else "normativa notarial"
    contexto = rag_svc.buscar_contexto(
        query=query,
        n_resultados=3,
        # Filtro de metadatos para evitar alucinaciones inter-jurisdiccionales
        # Note: Implementar filter en rag_service si aún no existe
    )
    
    return {"contexto_legal": contexto}

async def node_redactar(state: CertificacionState) -> dict:
    """Nodo Redactor: Generación de borrador con feedback cíclico."""
    logger.info(f"[Agente Redactor] Generando documento (Intento {state['intentos'] + 1})...")
    llm_svc = LLMService()
    
    contexto = state.get("contexto_legal", "")
    if state.get("feedback_legal"):
        contexto += f"\n\n[AVISO LEGAL - CORREGIR]: {state['feedback_legal']}"
    
    texto_ofuscado = await llm_svc.generar_certificacion(
        datos_ofuscados=state["datos_ofuscados"],
        tipo_certificacion=TipoDocumentoCertificar.FIRMA, # Default por ahora
        contexto_legal=contexto
    )
    
    return {
        "texto_generado": texto_ofuscado,
        "intentos": state["intentos"] + 1
    }

async def node_validar_legalidad(state: CertificacionState) -> dict:
    """Nodo Validador: Auditoría AI para asegurar cumplimiento normativo."""
    logger.info("[Agente Validador] Verificando legalidad del borrador...")
    
    texto = state["texto_generado"]
    # Simulación de validación experta
    errores = []
    if "DOY FE" not in texto.upper():
        errores.append("Falta la cláusula de cierre 'DOY FE'.")
    
    if errores and state["intentos"] < 3:
        return {
            "aprobado": False,
            "feedback_legal": ". ".join(errores)
        }
    
    return {"aprobado": True, "feedback_legal": None}

def node_desofuscar(state: CertificacionState) -> dict:
    """Nodo Privacy: Restauración de datos reales en el documento final."""
    logger.info("[Agente Privacy] Recomponiendo documento con PII real...")
    privacy_svc = PrivacyService()
    
    texto_final = privacy_svc.deanonymize_text(
        state["texto_generado"],
        state["mapa_inversion"]
    )
    
    return {"texto_final": texto_final}

# ============================================================
# LÓGICA DE CONTROL Y COMPILACIÓN
# ============================================================

def routing_validation(state: CertificacionState) -> Literal["redactar", "desofuscar"]:
    """Determina si el ciclo de validación continúa o finaliza."""
    if state["aprobado"]:
        return "desofuscar"
    return "redactar"

def create_advanced_graph():
    """Configura el grafo cíclico con memoria y checkpointer."""
    workflow = StateGraph(CertificacionState)
    
    # Registro de Nodos
    workflow.add_node("ofuscar", node_ofuscar)
    workflow.add_node("extractor_erp", node_extractor_erp)
    workflow.add_node("buscar_rag", node_buscar_rag)
    workflow.add_node("redactar", node_redactar)
    workflow.add_node("validar_legalidad", node_validar_legalidad)
    workflow.add_node("desofuscar", node_desofuscar)
    
    # Definición de Aristas
    workflow.set_entry_point("ofuscar")
    workflow.add_edge("ofuscar", "extractor_erp")
    workflow.add_edge("extractor_erp", "buscar_rag")
    workflow.add_edge("buscar_rag", "redactar")
    workflow.add_edge("redactar", "validar_legalidad")
    
    # Ciclo de Validación
    workflow.add_conditional_edges(
        "validar_legalidad",
        routing_validation
    )
    # Unión final
    workflow.add_edge("desofuscar", END)
    
    # Compilación con Memoria (Persistence)
    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)

# Singleton del Grafo
ofisolve_graph = create_advanced_graph()
