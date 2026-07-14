import uuid
from typing import Annotated, Any, Dict, List, Optional, TypedDict, Literal
from langgraph.graph.message import add_messages

class CertificacionState(TypedDict):
    """
    Estado compartido del ERP Notarial Avanzado (SaaS).
    Incluye memoria conversacional y metadatos de auditoría.
    """
    # Memoria y Contexto
    messages: Annotated[list, add_messages]
    contexto_legal: str
    jurisdiccion: str # Ej: CABA, Provincia de Buenos Aires
    preferencias_memoria: Optional[str]
    
    # Identificadores de Negocio (SaaS)
    tenant_id: Optional[uuid.UUID]
    tramite_id: Optional[int]
    workspace_id: Optional[int] # Deprecated por tenant_id, se mantiene por compatibilidad
    modo: Optional[str] # "consultas" o "creador"

    # Enrutamiento Inteligente
    tipo_tramite_detectado: Optional[Literal["certificacion", "escritura", "chat_general", "desconocido"]]
    
    # Datos de Procesamiento (Ofuscados)
    datos_ofuscados: Dict[str, Any]
    mapa_inversion: Dict[str, str]
    
    # Extracción (Data Entry Cero)
    datos_extraidos: Optional[dict]
    
    # Generación y Ciclo de Calidad
    texto_generado: str
    texto_final: str
    
    # Auditoría Estricta (Escrituras)
    requiere_uif: Optional[bool]
    requiere_asentimiento: Optional[bool]
    
    # Validación Notarial
    feedback_legal: Optional[str]
    intentos: int
    aprobado: bool
    
    # Control de Errores
    error: Optional[str]
