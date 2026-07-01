import sys
import os
import asyncio
from datetime import datetime

# Añadir el path del backend para poder importar modulos
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.database import AsyncSessionLocal, engine
from app.models.db_models import Base, Workspace, Usuario, Cliente, Tramite, DocumentoLibreria

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Check if we have a workspace
        from sqlalchemy import select
        res = await db.execute(select(Workspace).limit(1))
        workspace = res.scalars().first()
        
        if not workspace:
            workspace = Workspace(nombre="Escribanía Test", color="#3b82f6")
            db.add(workspace)
            await db.commit()
            await db.refresh(workspace)
            
        res = await db.execute(select(Usuario).limit(1))
        usuario = res.scalars().first()
        if not usuario:
            usuario = Usuario(
                email="test@escribania.com", 
                nombre_completo="Juan Escribano",
                escribaniaNombre="Escribanía Test",
                nroMatricula="1234",
                workspace_id=workspace.id,
                hashed_password="fake"
            )
            db.add(usuario)
            await db.commit()
        
        # Insert realistic clients
        res = await db.execute(select(Cliente).where(Cliente.nombre_completo == "Carlos Mendoza"))
        cliente = res.scalars().first()
        if not cliente:
            cliente = Cliente(
                workspace_id=workspace.id,
                nombre_completo="Carlos Mendoza",
                dni="2034567890",
                tipo_persona="Fisica",
                email="carlos@ejemplo.com",
                telefono="1122334455"
            )
            db.add(cliente)
            await db.commit()
            await db.refresh(cliente)

        # Insert a realistic tramite (folder)
        res = await db.execute(select(Tramite).where(Tramite.nombre == "Compraventa Inmueble Belgrano"))
        tramite = res.scalars().first()
        if not tramite:
            tramite = Tramite(
                workspace_id=workspace.id,
                cliente_id=cliente.id,
                nombre="Compraventa Inmueble Belgrano",
                tipo="escritura",
                estado="borrador"
            )
            db.add(tramite)
            await db.commit()
            await db.refresh(tramite)
        
        # Insert realistic documents inside the tramite
        res = await db.execute(select(DocumentoLibreria).where(DocumentoLibreria.tramite_id == tramite.id))
        docs = res.scalars().all()
        if len(docs) == 0:
            doc1 = DocumentoLibreria(
                workspace_id=workspace.id,
                cliente_id=cliente.id,
                tramite_id=tramite.id,
                nombre="DNI_Carlos_Mendoza.pdf",
                tipo="pdf",
                path="/mock/DNI_Carlos_Mendoza.pdf",
                fecha_subida=datetime.utcnow()
            )
            doc2 = DocumentoLibreria(
                workspace_id=workspace.id,
                cliente_id=cliente.id,
                tramite_id=tramite.id,
                nombre="Borrador_Boleto_Compraventa.docx",
                tipo="docx",
                path="/mock/Borrador_Boleto_Compraventa.docx",
                fecha_subida=datetime.utcnow()
            )
            doc3 = DocumentoLibreria(
                workspace_id=workspace.id,
                cliente_id=cliente.id,
                tramite_id=tramite.id,
                nombre="Informe_Dominio.pdf",
                tipo="pdf",
                path="/mock/Informe_Dominio.pdf",
                fecha_subida=datetime.utcnow()
            )
            db.add_all([doc1, doc2, doc3])
            await db.commit()
            
        print("Data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
