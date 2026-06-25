"""
Modelos Pydantic para validación de entrada/salida de la API.
Esquemas estrictamente tipados para certificaciones notariales.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from typing import List


# ============================================================
# Enums - Tipos de documentos soportados
# ============================================================

class TipoDocumentoCertificar(str, Enum):
    """Tipos de documentos que pueden ser certificados por la escribanía."""
    FOTOCOPIA = "fotocopia"
    FIRMA = "firma"
    CONTENIDO = "contenido"
    FECHA_CIERTA = "fecha_cierta"
    VIAJE_MENORES = "viaje_menores"
    SUPERVIVENCIA = "supervivencia"


class EstadoDocumento(str, Enum):
    """Estados del ciclo de vida de un documento generado."""
    BORRADOR = "borrador"
    PENDIENTE_REVISION = "pendiente_revision"
    APROBADO = "aprobado"
    FIRMADO = "firmado"
    ANULADO = "anulado"


# ============================================================
# Modelos de Entrada (Request)
# ============================================================

class CertificacionRequest(BaseModel):
    """Payload de entrada para generar una certificación notarial."""
    nombre_requirente: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Nombre completo del requirente",
        examples=["Juan Carlos Pérez"],
    )
    dni: str = Field(
        ...,
        pattern=r"^\d{7,8}$",
        description="Documento Nacional de Identidad (7 u 8 dígitos, sin puntos)",
        examples=["35123456"],
    )
    tipo_documento_a_certificar: TipoDocumentoCertificar = Field(
        ...,
        description="Tipo de documento a certificar",
        examples=["fotocopia"],
    )
    domicilio: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Domicilio del requirente (opcional)",
        examples=["Av. Corrientes 1234, CABA"],
    )
    cuit: Optional[str] = Field(
        default=None,
        pattern=r"^\d{2}-\d{8}-\d{1}$",
        description="CUIT del requirente (formato XX-XXXXXXXX-X)",
        examples=["20-35123456-7"],
    )
    observaciones: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Observaciones adicionales del escribano",
    )
    fuentes_seleccionadas: Optional[List[str]] = Field(
        default=None,
        description="Lista de subtítulos o IDs de fuentes normativas para acotar el contexto del modelo",
    )
    ai_provider: Optional[str] = Field(
        default=None,
        description="Proveedor de IA específico para esta solicitud (ollama o mock)",
    )
    workspace_id: Optional[int] = Field(
        default=1,
        description="ID del workspace actual",
    )
    tramite_id: Optional[int] = Field(
        default=None,
        description="ID del trámite actual si lo hay",
    )


# ============================================================
# Modelos de Salida (Response)
# ============================================================

class AnonymizationInfo(BaseModel):
    """Información sobre el proceso de anonimización (para auditoría)."""
    campos_anonimizados: int = Field(
        description="Cantidad de campos sensibles detectados y enmascarados"
    )
    tipos_detectados: list[str] = Field(
        description="Tipos de entidades PII detectadas (ej: NOMBRE, DNI, CUIT)"
    )


class PersonaExtraidaResponse(BaseModel):
    """Datos de una persona extraída del documento."""
    nombre: str
    dni_cuit: str
    rol: str

class DatosExtraidosResponse(BaseModel):
    """Datos del trámite y personas extraídos por el agente."""
    tramite_id: Optional[int] = None
    tipo_acto: Optional[str] = None
    clientes: List[PersonaExtraidaResponse]


class CertificacionResponse(BaseModel):
    """Respuesta del endpoint de generación de certificación."""
    id: UUID = Field(
        default_factory=uuid4,
        description="Identificador único de la operación",
    )
    texto_generado: str = Field(
        description="Texto final de la certificación con datos reales restaurados"
    )
    estado: EstadoDocumento = Field(
        default=EstadoDocumento.BORRADOR,
        description="Estado inicial del documento generado",
    )
    anonimizacion: AnonymizationInfo = Field(
        description="Resumen del proceso de anonimización aplicado"
    )
    requiere_revision: bool = Field(
        default=True,
        description="Indica si el documento requiere revisión del escribano (siempre True)",
    )
    archivo_docx: Optional[str] = Field(
        default=None,
        description="Nombre del archivo .docx generado (si se solicitó)",
    )
    ruta_descarga: Optional[str] = Field(
        default=None,
        description="Ruta relativa para descargar el archivo .docx",
    )
    modo_llm: str = Field(
        default="mock",
        description="Modo del LLM utilizado (mock o produccion)",
    )
    generado_en: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp de generación",
    )
    datos_extraidos: Optional[DatosExtraidosResponse] = Field(
        default=None,
        description="Datos estructurados extraídos del documento (Post-procesamiento)"
    )
    tramite_id: Optional[int] = Field(
        default=None,
        description="ID del trámite generado o actualizado",
    )


class ErrorResponse(BaseModel):
    """Modelo estándar de error de la API."""
    detail: str = Field(description="Descripción del error")
    error_code: str = Field(description="Código de error interno")
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp del error",
    )
