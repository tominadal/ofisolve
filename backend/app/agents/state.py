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
    
    # Identificadores de Negocio (SaaS)
    tenant_id: Optional[uuid.UUID]
    tramite_id: Optional[int]
    workspace_id: Optional[int] # Deprecated por tenant_id, se mantiene por compatibilidad

    
    # Datos de Procesamiento (Ofuscados)
    datos_ofuscados: Dict[str, Any]
    mapa_inversion: Dict[str, str]
    
    # Extracción (Data Entry Cero)
    datos_extraidos: Optional[dict]
    
    # Generación y Ciclo de Calidad
    texto_generado: str
    texto_final: str
    
    # Validación Notarial
    feedback_legal: Optional[str]
    intentos: int
    aprobado: bool
    
    # Control de Errores
    error: Optional[str]
