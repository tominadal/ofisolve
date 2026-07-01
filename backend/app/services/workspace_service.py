import os
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import db_models
from app.rag.rag_service import RAGService
import time

class WorkspaceService:
    @staticmethod
    async def upload_document(
        workspace_id: int, 
        tramite_id: int | None, 
        file: UploadFile, 
        db: AsyncSession
    ):
        if not file:
            raise HTTPException(status_code=400, detail="No se proveyó ningún archivo")
            
        content = await file.read()
        UPLOAD_DIR = "uploads"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Generar nombre único y prevenir Path Traversal
        timestamp = int(time.time())
        secure_filename = os.path.basename(file.filename)
        safe_name = f"ws_{workspace_id}_t{tramite_id}_{timestamp}_{secure_filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        
        with open(file_path, "wb") as buffer:
            buffer.write(content)
            
        nuevo_doc = db_models.DocumentoLibreria(
            workspace_id=workspace_id,
            tramite_id=tramite_id,
            nombre=file.filename,
            tipo="SubidaUsuario",
            ruta_archivo=file_path,
            tamanio_bytes=len(content)
        )
        db.add(nuevo_doc)
        await db.commit()
        await db.refresh(nuevo_doc)
        
        # Indexar en RAG si corresponde
        if tramite_id:
            rag = RAGService()
            rag.indexar_documento_tramite(
                tramite_id=tramite_id,
                doc_id=nuevo_doc.id,
                contenido_bytes=content,
                nombre=file.filename
            )
            
        return nuevo_doc

    @staticmethod
    def delete_physical_file(file_path: str):
        """Elimina un archivo físico del disco para evitar storage leaks."""
        import os
        from loguru import logger
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"[WorkspaceService] Archivo físico eliminado: {file_path}")
        except Exception as e:
            logger.error(f"[WorkspaceService] Error eliminando archivo físico {file_path}: {e}")
