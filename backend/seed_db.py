import asyncio
import datetime
from sqlalchemy import select
from app.core.database import engine, get_db
from app.models.db_models import Base, User, Workspace, Tramite
from app.core.security import get_password_hash

async def seed():
    async with engine.begin() as conn:
        # Recrear tablas si es necesario
        # await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async for db in get_db():
        # Ver si ya hay usuarios
        result = await db.execute(select(User).filter(User.email == "martin.rodriguez@escribania.com.ar"))
        user = result.scalars().first()
        
        if not user:
            print("Creando usuario de prueba...")
            user = User(
                email="martin.rodriguez@escribania.com.ar",
                hashed_password=get_password_hash("admin123"),
                nombre_completo="Dr. Martin Rodriguez",
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # Ver si hay workspaces
        result = await db.execute(select(Workspace).limit(1))
        workspace = result.scalars().first()
        
        if not workspace:
            print("Creando workspace de prueba...")
            workspace = Workspace(
                nombre="Certificaciones 2026",
                descripcion="Tramites de certificacion de firmas",
                color="#3b82f6",
                fecha_creacion=datetime.datetime.utcnow()
            )
            db.add(workspace)
            await db.commit()
            await db.refresh(workspace)
            
            # Un trámite inicial
            tramite = Tramite(
                workspace_id=workspace.id,
                nombre="Certificación de Firma - Test Inicial",
                tipo="certificacion",
                estado="en_progreso",
                fecha_creacion=datetime.datetime.utcnow(),
                fecha_actualizacion=datetime.datetime.utcnow()
            )
            db.add(tramite)
            await db.commit()

        print("Base de datos inicializada correctamente.")
        break # get_db es un generador asíncrono

if __name__ == "__main__":
    asyncio.run(seed())
