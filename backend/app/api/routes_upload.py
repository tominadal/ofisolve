import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.api.dependencies import get_current_user
from app.models import db_models, documento_schemas
from app.rag.rag_service import RAGService

router = APIRouter(prefix="/workspaces", tags=["Librería y Carga"])

# Directorio temporal para archivos subidos
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/{workspace_id}/documentos", response_model=documento_schemas.DocumentoLibreriaResponse)
async def upload_documento(
    workspace_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: db_models.Usuario = Depends(get_current_user)
):
    """
    Sube un archivo a la librería legal del workspace y lo indexa en el RAG.
    """
    # 1. Guardar archivo físicamente
    file_path = os.path.join(UPLOAD_DIR, f"ws_{workspace_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # 2. Registrar en base de datos
    db_doc = db_models.DocumentoLibreria(
        workspace_id=workspace_id,
        nombre=file.filename,
        tipo=file.filename.split(".")[-1],
        path=file_path
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    
    # 3. Ingestar en RAG (solo si es texto o PDF simulado por ahora)
    # Por simplicidad, asumimos que el contenido es texto para el MVP
    try:
        rag_service = RAGService()
        # En una implementación real, aquí usaríamos un extractor (PyPDF2, etc.)
        # Por ahora simulamos la extracción del texto del buffer
        texto_extraido = content.decode("utf-8", errors="ignore")
        rag_service.agregar_documento_dinamico(
            contenido=texto_extraido,
            nombre=file.filename,
            tipo_doc="procedimiento"
        )
    except Exception as e:
        logger.warning(f"Error indexando en RAG: {e}")
        # No fallamos la subida completa si el RAG falla
    
    return db_doc

@router.get("/{workspace_id}/documentos", response_model=List[documento_schemas.DocumentoLibreriaResponse])
async def listar_documentos(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.Usuario = Depends(get_current_user)
):
    """Retorna la lista de documentos cargados en el workspace."""
    result = await db.execute(select(db_models.DocumentoLibreria).filter(db_models.DocumentoLibreria.workspace_id == workspace_id))
    return result.scalars().all()
