from typing import Any, Dict, List, Optional, TypedDict, Literal
from langgraph.graph import StateGraph, END
from loguru import logger

from app.models.schemas import TipoDocumentoCertificar, EstadoDocumento
from app.services.privacy_service import get_privacy_service
from app.services.llm_service import LLMService
from app.rag.rag_service import RAGService
from app.services.extraction_service import ExtractorService
from app.core.database import AsyncSessionLocal

# ============================================================
# Singletons de servicios pesados — se crean una única vez
# ============================================================

_llm_service: LLMService | None = None
_rag_service: RAGService | None = None
_extractor_service: ExtractorService | None = None


def _get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


def _get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


def _get_extractor_service() -> ExtractorService:
    global _extractor_service
    if _extractor_service is None:
        _extractor_service = ExtractorService()
    return _extractor_service

# ============================================================
# Estado del Grafo — ERP Notarial Cíclico
# ============================================================

class CertificacionState(TypedDict):
    """Estado compartido en el ERP Autómata."""
    # Entrada inicial
    nombre_requirente: str
    dni: str
    tipo_certificacion: str
    domicilio: Optional[str]
    cuit: Optional[str]
    observaciones: Optional[str]
    nombre_escribano: str
    nro_registro: str

    # Procesamiento persistente
    datos_crudos: Dict[str, Any]
    datos_ofuscados: Dict[str, Any]
    mapa_inversion: Dict[str, str]
    fuentes_seleccionadas: Optional[List[str]]
    contexto_legal: str
    texto_ofuscado: str
    texto_final: str

    # Gestión de Ciclos y Validación
    feedback_validador: Optional[str]
    intentos: int
    aprobado: bool

    # Salida ERP
    datos_extraidos: Optional[dict]
    nombre_archivo: Optional[str]
    archivo_docx: Optional[str]
    estado: str
    
    # Metadata Interna
    ai_provider: Optional[str]
    tenant_id: Optional[int]
    tramite_id: Optional[int]
    error: Optional[str]

# ============================================================
# Nodos del Grafo (Funciones de Agentes)
# ============================================================

def ofuscar_local(state: CertificacionState) -> dict:
    """Nodo: PrivacyService Ofuscar (Local On-Premise)"""
    logger.info("[Agente Privacy] Ofuscando PII localmente...")
    
    # Preparar datos base
    datos_crudos = {
        "nombre_requirente": state["nombre_requirente"],
        "dni": state["dni"],
        "tipo": state["tipo_certificacion"],
    }
    if state.get("domicilio"): datos_crudos["domicilio"] = state["domicilio"]
    if state.get("cuit"): datos_crudos["cuit"] = state["cuit"]
    if state.get("observaciones"): datos_crudos["observaciones"] = state["observaciones"]

    privacy_svc = get_privacy_service()  # singleton — no recarga spaCy
    datos_ofuscados, mapa_inversion = privacy_svc.anonymize_payload(datos_crudos)
    stats = privacy_svc.get_stats(mapa_inversion)

    return {
        "datos_crudos": datos_crudos,
        "datos_ofuscados": datos_ofuscados,
        "mapa_inversion": mapa_inversion,
        "campos_anonimizados": stats["campos_anonimizados"],
        "intentos": 0,
        "aprobado": False
    }

async def extraer_entidades(state: CertificacionState) -> dict:
    """Nodo: Agente Extractor LLM (Data Entry Cero)"""
    logger.info("[Agente ERP] Extrayendo entidades y persistiendo en BD relacional...")
    
    try:
        ai_provider = state.get("ai_provider")
        if ai_provider:
            extractor = ExtractorService(provider=ai_provider)
        else:
            extractor = _get_extractor_service()
        async with AsyncSessionLocal() as db:
            # Serializar datos crudos para el extractor
            texto_para_extraer = f"Tipo de trámite: {state.get('tipo_certificacion', '')}. "
            texto_para_extraer += f"Nombre: {state.get('nombre_requirente', '')}. DNI: {state.get('dni', '')}. "
            
            # Necesitamos el workspace_id del estado o del tenant_id
            workspace_id = state.get("workspace_id") or 1
            datos_extraidos = await extractor.procesar_y_persistir(texto_para_extraer, db, workspace_id)
            return {"datos_extraidos": dict(datos_extraidos) if datos_extraidos else None}
    except Exception as e:
        logger.error(f"[Error Extractor] No crítico: {str(e)}")
        return {"datos_extraidos": None}

async def recuperar_rag_local(state: CertificacionState) -> dict:
    """Nodo: Agente RAG Local (ChromaDB Similitud Semántica)"""
    if state.get("ai_provider") == "mock":
        logger.info("[Agente RAG] Modo mock, retornando contexto simulado.")
        return {"contexto_legal": "Contexto legal mockeado."}
        
    try:
        logger.info("[Agente RAG] Recuperando normativa y base de conocimiento local...")
        rag_svc = _get_rag_service()  # singleton
        query = f"REGLAMENTACION NOTARIAL ARGENTINA PROCEDIMIENTO {state['tipo_certificacion']}"
        contexto = await rag_svc.buscar_contexto(
            query=query,
            n_resultados=4,
            tramite_id=state.get("tramite_id")
        )
        return {"contexto_legal": contexto}
    except Exception as e:
        logger.error(f"[Error RAG] Ignorando: {str(e)}")
        return {"contexto_legal": "No se pudo recuperar contexto legal. Procede con principios generales."}

async def redactar_llm(state: CertificacionState) -> dict:
    """Nodo: Agente Redactor LLM (Ollama Local)"""
    try:
        logger.info(f"[Agente Redactor] Generando borrador notarial (Intento {state.get('intentos', 0) + 1})...")
        ai_provider = state.get("ai_provider")
        if ai_provider:
            llm_svc = LLMService(provider=ai_provider)
        else:
            llm_svc = _get_llm_service()
        
        tipo_str = str(state.get("tipo_certificacion", "firma"))
        tipo = TipoDocumentoCertificar(tipo_str)
        
        contexto = state.get("contexto_legal", "")
        if state.get("feedback_validador"):
            contexto += f"\n\n[FEEDBACK DEL VALIDADOR - CORREGIR LO SIGUIENTE]: {state['feedback_validador']}"

        texto_ofuscado = await llm_svc.generar_certificacion(
            datos_ofuscados=dict(state.get("datos_ofuscados", {})),
            tipo_certificacion=tipo,
            contexto_legal=contexto,
        )
        
        return {
            "texto_ofuscado": str(texto_ofuscado),
            "intentos": int(state.get("intentos", 0)) + 1
        }
    except Exception as e:
        logger.error(f"[Error Redactor] Crítico: {str(e)}")
        return {"error": f"Error redactando: {str(e)}", "intentos": 3} # Forzar salida

async def validar_llm(state: CertificacionState) -> dict:
    """Nodo: Agente Validador (Ciclo de Calidad AI)"""
    logger.info("[Agente Validador] Auditando borrador generado...")
    
    texto = state["texto_ofuscado"]
    
    # Lógica de validación (MVP: Check de presencia de tokens y longitud mínima)
    # En producción esto sería otra llamada a Gemini con un prompt de auditoría
    errores = []
    if len(texto) < 100: 
        errores.append("El documento es demasiado corto para ser un acta notarial legal.")
    if "DOY FE" not in texto.upper():
        errores.append("Falta la cláusula de cierre obligatoria 'DOY FE'.")
    
    # Máximo 3 reintentos para evitar loops infinitos billables
    if errores and state["intentos"] < 3:
        logger.warning(f"[Agente Validador] Rechazado: {'; '.join(errores)}")
        return {
            "aprobado": False,
            "feedback_validador": "; ".join(errores)
        }
    
    logger.info("[Agente Validador] Borrador aprobado exitosamente.")
    return {"aprobado": True, "feedback_validador": None}

def desofuscar_local(state: CertificacionState) -> dict:
    """Nodo: PrivacyService Desofuscar (Local On-Premise)"""
    logger.info("[Agente Privacy] Desofuscando y restaurando PII real...")
    
    privacy_svc = get_privacy_service()  # singleton — misma instancia que ofuscar_local
    texto_final = privacy_svc.deanonymize_text(
        state["texto_ofuscado"],
        state["mapa_inversion"]
    )
    
    return {"texto_final": texto_final}

# ============================================================
# Lógica de Control (Edges)
# ============================================================

def decision_validador(state: CertificacionState) -> Literal["redactar_llm", "desofuscar_local"]:
    """Controla si volvemos a redactar o avanzamos al final."""
    if state["aprobado"]:
        return "desofuscar_local"
    return "redactar_llm"

# ============================================================
# Construcción del Grafo Cíclico
# ============================================================

def crear_grafo_certificacion() -> StateGraph:
    """Compila el grafo multi-agente cíclico."""
    workflow = StateGraph(CertificacionState)

    # Nodos
    workflow.add_node("ofuscar_local", ofuscar_local)
    workflow.add_node("extraer_entidades", extraer_entidades)
    workflow.add_node("recuperar_rag_local", recuperar_rag_local)
    workflow.add_node("redactar_llm", redactar_llm)
    workflow.add_node("validar_llm", validar_llm)
    workflow.add_node("desofuscar_local", desofuscar_local)

    # Aristas (Estructura Cíclica)
    workflow.set_entry_point("ofuscar_local")
    
    # Flujo paralelo-secuencial inicial
    workflow.add_edge("ofuscar_local", "extraer_entidades")
    workflow.add_edge("extraer_entidades", "recuperar_rag_local")
    workflow.add_edge("recuperar_rag_local", "redactar_llm")
    
    # El Bucle de Validación
    workflow.add_edge("redactar_llm", "validar_llm")
    workflow.add_conditional_edges(
        "validar_llm",
        decision_validador
    )
    
    # Finalización
    workflow.add_edge("desofuscar_local", END)

    return workflow.compile()

grafo_certificacion = crear_grafo_certificacion()
