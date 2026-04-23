import os
import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.models.db_models import DocumentoLibreria, Cliente, Tramite
from app.core.config import get_settings

class DocumentService:
    """
    Servicio profesional para la gestión de documentos en el filesystem local y base de datos.
    Sincroniza la persistencia física con el registro de metadatos.
    """

    def __init__(self):
        settings = get_settings()
        self.base_uploads = os.path.join(os.getcwd(), "uploads")
        self.clientes_dir = os.path.join(self.base_uploads, "clientes")
        os.makedirs(self.clientes_dir, exist_ok=True)

    async def listar_por_cliente(self, db: AsyncSession, cliente_id: int) -> List[dict]:
        """Lista todos los documentos registrados para un cliente."""
        stmt = select(DocumentoLibreria).where(DocumentoLibreria.cliente_id == cliente_id)
        result = await db.execute(stmt)
        docs = result.scalars().all()
        return [
            {
                "id": d.id,
                "nombre": d.nombre,
                "tipo": d.tipo,
                "path": d.path,
                "fecha_subida": d.fecha_subida,
                "tramite_id": d.tramite_id
            }
            for d in docs
        ]

    async def obtener_contenido(self, db: AsyncSession, doc_id: int) -> Optional[str]:
        """Lee el contenido de un archivo de texto/docx registrado."""
        stmt = select(DocumentoLibreria).where(DocumentoLibreria.id == doc_id)
        result = await db.execute(stmt)
        doc = result.scalars().first()
        
        if not doc:
            return None
            
        if not os.path.exists(doc.path):
            logger.warning(f"Archivo no encontrado en disco: {doc.path}")
            return f"[Error: El archivo físico '{doc.nombre}' no se encuentra en el servidor. Contacte al administrador.]"

        # Por ahora solo soportamos lectura de archivos de texto/planos para el LLM
        # En una versión pro extenderíamos con PDFMiner o similar
        try:
            with open(doc.path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error leyendo archivo {doc.path}: {e}")
            return f"[Error: No se pudo leer el contenido del archivo {doc.nombre}]"

    async def guardar_documento(
        self, 
        db: AsyncSession, 
        nombre: str, 
        contenido: str, 
        workspace_id: int,
        cliente_id: Optional[int] = None,
        tramite_id: Optional[int] = None
    ) -> DocumentoLibreria:
        """Guarda un nuevo documento en el FS y lo registra en la DB."""
        
        # Determinar ruta
        target_dir = self.clientes_dir
        if cliente_id:
            target_dir = os.path.join(target_dir, f"cliente_{cliente_id}")
        if tramite_id:
            target_dir = os.path.join(target_dir, f"tramite_{tramite_id}")
        
        os.makedirs(target_dir, exist_ok=True)
        
        # Evitar colisión de nombres
        base_name, ext = os.path.splitext(nombre)
        if not ext: ext = ".txt"
        final_path = os.path.join(target_dir, f"{base_name}{ext}")
        
        counter = 1
        while os.path.exists(final_path):
            final_path = os.path.join(target_dir, f"{base_name}_{counter}{ext}")
            counter += 1

        # Escribir en disco
        with open(final_path, "w", encoding="utf-8") as f:
            f.write(contenido)
        
        logger.info(f"Documento guardado en disco: {final_path}")

        # Registrar en DB
        nuevo_doc = DocumentoLibreria(
            workspace_id=workspace_id,
            cliente_id=cliente_id,
            tramite_id=tramite_id,
            nombre=os.path.basename(final_path),
            tipo=ext.replace(".", ""),
            path=final_path,
            fecha_subida=datetime.datetime.utcnow()
        )
        db.add(nuevo_doc)
        await db.commit()
        await db.refresh(nuevo_doc)
        
        return nuevo_doc
