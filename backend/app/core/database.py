import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import get_settings

settings = get_settings()
SQLALCHEMY_DATABASE_URL = settings.database_url

# Configuración Engine Asíncrono (PostgreSQL en Docker)
engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    # pool_pre_ping=True, # Recomendado para PostgreSQL en containers
)

# Fábrica de sesiones asíncronas
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    """Dependencia para la sesión de DB asíncrona."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
