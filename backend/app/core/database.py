from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator

from app.core.config import get_settings

settings = get_settings()

# Configuración de SSL para PostgreSQL (Neon/Railway)
connect_args = {}
if settings.is_postgres:
    connect_args = {"ssl": True}

# Determinar argumentos del engine según el driver
engine_kwargs = {
    "echo": False,
    "connect_args": connect_args,
}

if settings.is_postgres:
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    })

engine = create_async_engine(
    settings.final_database_url,
    **engine_kwargs
)

# Activar Foreign Keys explícitamente en SQLite para que el CASCADE funcione
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.final_database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

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
