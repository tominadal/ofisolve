"""
API Router para generación de certificaciones notariales.

Flujo E2E orquestado por LangGraph:
  validate → anonymize → RAG → LLM → deanonymize → docx → response

Endpoints:
  POST /api/v1/generate/certificacion          → JSON con texto + metadatos
  POST /api/v1/generate/certificacion?format=docx → Descarga directa del .docx
  GET  /api/v1/generate/descargar/{nombre}     → Descarga de documento generado
  POST /api/v1/generate/rag/ingestar           → Ingesta documentos en ChromaDB
  GET  /api/v1/generate/rag/stats              → Estadísticas del RAG
  GET  /api/v1/generate/health                 → Health check del servicio
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status, Request
from fastapi.responses import FileResponse
from loguru import logger

from app.api.dependencies import limiter
from app.models.schemas import (
    CertificacionRequest,
    CertificacionResponse,
    AnonymizationInfo,
    ErrorResponse,
    EstadoDocumento,
)
from app.agents.certification_agent import grafo_certificacion
from app.rag.rag_service import RAGService
from app.core.database import get_db
from app.services.extraction_service import extraer_y_guardar_entidades
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

router = APIRouter(tags=["Generación de Documentos"])

# Directorio de salida para documentos generados
_OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "output"

# Singleton lazy del RAG
_rag_service: RAGService | None = None


def _get_rag_service() -> RAGService:
    """Proveedor singleton lazy para RAGService."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


# ============================================================
# Endpoints principales
# ============================================================

from app.services.document_service import DocumentService

@router.post(
    "/certificacion",
    response_model=CertificacionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generar certificación notarial (flujo cíclico multi-agente)",
    description=(
        "Flujo ERP Autómata: ofuscación → extracción ERP → RAG → redacción → "
        "validación (bucle) → desofuscación → generación de documento."
    ),
    responses={
        422: {"model": ErrorResponse, "description": "Error de validación"},
        500: {"model": ErrorResponse, "description": "Error interno"},
    },
)
@limiter.limit("5/minute")
async def generar_certificacion(
    request: Request,
    payload: CertificacionRequest,
    format: Optional[str] = Query(
        default=None,
        description="Formato de respuesta: 'json' (default) o 'docx' (descarga)",
        enum=["json", "docx"],
    ),
    nombre_escribano: str = Query(
        default="[Nombre del Escribano/a]",
        description="Nombre del escribano firmante",
    ),
    nro_registro: str = Query(
        default="XXX",
        description="Número del registro notarial",
    ),
    db: AsyncSession = Depends(get_db),
) -> CertificacionResponse | FileResponse:
    """
    Endpoint principal del ERP — Orquesta el ciclo de vida documental.
    """
    audit_logger = logger.bind(audit=True)

    try:
        # Asegurar que el RAG tenga datos (Carga bajo demanda)
        rag_svc = _get_rag_service()
        if rag_svc.get_stats()["total_documentos"] == 0:
            rag_svc.ingestar_documentos()

        # 1. Preparar estado inicial para el Grafo Cíclico
        estado_inicial = {
            "nombre_requirente": payload.nombre_requirente,
            "dni": payload.dni,
            "tipo_certificacion": payload.tipo_documento_a_certificar.value,
            "domicilio": payload.domicilio,
            "cuit": payload.cuit,
            "observaciones": payload.observaciones,
            "fuentes_seleccionadas": payload.fuentes_seleccionadas,
            "nombre_escribano": nombre_escribano,
            "nro_registro": nro_registro,
            "intentos": 0,
            "aprobado": False,
            "feedback_validador": None,
            "ai_provider": payload.ai_provider
        }

        audit_logger.info("Iniciando Grafo Multi-Agente Cíclico...")

        # 2. Ejecutar Grafo LangGraph
        resultado = await grafo_certificacion.ainvoke(estado_inicial)

        if resultado.get("error"):
            raise HTTPException(status_code=500, detail=resultado["error"])

        # 3. Generación de Documento .docx (Post-Grafo)
        doc_svc = DocumentService()
        display_names = {
            "fotocopia": "CERTIFICACIÓN DE FOTOCOPIA",
            "firma": "CERTIFICACIÓN DE FIRMA",
            "contenido": "CERTIFICACIÓN DE CONTENIDO",
            "fecha_cierta": "CERTIFICACIÓN DE FECHA CIERTA",
        }
        
        datos_docx = {
            "texto_certificacion": resultado.get("texto_final"),
            "tipo_certificacion_display": display_names.get(payload.tipo_documento_a_certificar.value, "CERTIFICACIÓN"),
            "nombre_escribano": nombre_escribano,
            "nro_registro": nro_registro,
        }
        
        ruta_docx = doc_svc.generar_docx(
            datos_finales=datos_docx,
            nombre_plantilla="certificacion_generica.docx"
        )
        nombre_archivo = ruta_docx.name

        # 4. Manejo de respuesta según formato
        if format == "docx":
            return FileResponse(
                path=str(ruta_docx),
                filename=nombre_archivo,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
            )

        # Respuesta JSON con datos extraídos por el Agente ERP
        return CertificacionResponse(
            texto_generado=resultado.get("texto_final", ""),
            estado=EstadoDocumento.APROBADO, 
            anonimizacion=AnonymizationInfo(
                campos_anonimizados=resultado.get("campos_anonimizados", 0),
                tipos_detectados=["NOMBRE", "DNI", "CUIT", "DOMICILIO"],
            ),
            requiere_revision=True,
            archivo_docx=nombre_archivo,
            ruta_descarga=f"/api/v1/generate/descargar/{nombre_archivo}",
            modo_llm=resultado.get("ai_provider") or "ollama",
            datos_extraidos=resultado.get("datos_extraidos")
        )

    except HTTPException:
        raise

    except Exception as e:
        audit_logger.critical(
            "Error interno no controlado",
            error=str(e),
            error_type=type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al generar la certificación: {str(e)}",
        )


# ============================================================
# Endpoint de descarga
# ============================================================

@router.get(
    "/descargar/{nombre_archivo}",
    summary="Descargar documento .docx generado",
    responses={404: {"description": "Archivo no encontrado"}},
)
async def descargar_documento(nombre_archivo: str) -> FileResponse:
    """Descarga un documento .docx generado previamente."""
    ruta = _OUTPUT_DIR / nombre_archivo

    if not ruta.exists() or not ruta.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Archivo '{nombre_archivo}' no encontrado.",
        )

    if not nombre_archivo.endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten descargas de archivos .docx.",
        )

    return FileResponse(
        path=str(ruta),
        filename=nombre_archivo,
        media_type=(
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ),
    )


# ============================================================
# Endpoints del RAG
# ============================================================

@router.post(
    "/rag/ingestar",
    summary="Ingestar base de conocimiento legal en ChromaDB",
    tags=["RAG"],
)
async def ingestar_rag(forzar: bool = Query(default=False)) -> dict:
    """
    Ingesta los documentos legales en la colección de ChromaDB.
    
    Args:
        forzar: Si True, borra todo y reingesta desde cero.
    """
    rag_svc = _get_rag_service()
    total = rag_svc.ingestar_documentos(forzar=forzar)

    return {
        "status": "ok",
        "chunks_ingestados": total,
        "forzado": forzar,
    }


@router.get(
    "/rag/stats",
    summary="Estadísticas del sistema RAG",
    tags=["RAG"],
)
async def rag_stats() -> dict:
    """Retorna estadísticas del estado del RAG (ChromaDB)."""
    rag_svc = _get_rag_service()
    return rag_svc.get_stats()

@router.get(
    "/rag/sources",
    summary="Listado de fuentes normativas del RAG",
    tags=["RAG"],
)
async def rag_sources() -> list[dict]:
    """Retorna los documentos base disponibles para consultas."""
    from app.rag.knowledge_base import DOCUMENTOS_RAG
    return [
        {
            "id": f"{doc['tipo']}_{doc['jurisdiccion']}_{idx}",
            "titulo": doc["titulo"],
            "fuente": doc["fuente"],
            "tipo": doc["tipo"],
            "jurisdiccion": doc["jurisdiccion"],
        }
        for idx, doc in enumerate(DOCUMENTOS_RAG)
    ]


# ============================================================
# Health check
# ============================================================

@router.get(
    "/health",
    summary="Estado del servicio de generación",
    tags=["Sistema"],
)
async def health_check() -> dict:
    """Verifica que el servicio de generación esté operativo."""
    rag_svc = _get_rag_service()
    rag_stats_data = rag_svc.get_stats()

    from app.services.llm_service import LLMService
    llm_svc = LLMService()

    return {
        "status": "ok",
        "orquestacion": "langgraph",
        "privacy_engine": "presidio",
        "llm": {
            "provider": llm_svc._provider,
            "is_mock": llm_svc.is_mock,
        },
        "rag": {
            "engine": "chromadb",
            "documentos": rag_stats_data["total_documentos"],
            "proveedor": rag_stats_data["proveedor_ia"],
        },
        "document_engine": "docxtpl",
    }
