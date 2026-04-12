import asyncio
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine, Base
from app.models.db_models import Usuario, Cliente, Tramite, Participacion

async def init_db():
    """Crea todas las tablas del ERP de forma asíncrona."""
    try:
        logger.info("Iniciando creación de tablas en PostgreSQL...")
        async with engine.begin() as conn:
            # Crear tablas vinculadas a Base de app.core.database
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Base de datos inicializada correctamente.")
    except Exception as e:
        logger.error(f"Error al inicializar la base de datos: {str(e)}")
        raise

if __name__ == "__main__":
    # Ejecución manual del script si es necesario
    asyncio.run(init_db())
