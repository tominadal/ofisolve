from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.core.config import get_settings

settings = get_settings()

# Configuración de SSL para PostgreSQL (Neon/Railway)
connect_args = {}
if settings.is_postgres:
    connect_args = {"ssl": True}

# Engine Asíncrono con pooling para alta concurrencia
engine = create_async_engine(
    settings.final_database_url,
    echo=False,
    pool_size=20,          # Máximo de conexiones persistentes
    max_overflow=10,       # Conexiones extra permitidas en pico de carga
    pool_recycle=3600,     # Reciclar conexión cada 1 hora
    pool_pre_ping=True,    # Verificar salud antes de usar
    connect_args=connect_args,
)

# Fábrica de sesiones
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

class Base(DeclarativeBase):
    """Clase base para todos los modelos del ERP."""
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia inyectable para FastAPI/LangGraph."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
