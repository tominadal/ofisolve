"""
Punto de entrada de la aplicación FastAPI.

Configura CORS, logging, y registra los routers de la API.
Ejecutar con: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.database import Base, engine
from app.models.db_models import Usuario, Workspace, Cliente, Tramite, Participacion, MensajeChat
from app.api.auth import router as auth_router
from app.api.routes_certificacion import router as certificacion_router
from app.api.routes_clientes import router as clientes_router
from app.api.routes_workspaces import router as workspaces_router
from app.api.routes_tramites import router as tramites_router
from app.api.routes_export import router as export_router

# NOTA: routes_upload.py eliminado del main — su lógica fue integrada en routes_workspaces.py
# NOTA: routes_portal.py eliminado — era duplicado exacto de routes_tramites.py


async def _seed_initial_data(db_session) -> None:
    """
    Crea datos iniciales si la base de datos está completamente vacía.
    Esto garantiza que el frontend siempre tenga algo para mostrar en el primer arranque.
    """
    from sqlalchemy import select, func
    from app.core.security import get_password_hash

    # ¿Ya hay usuarios?
    result = await db_session.execute(select(func.count(Usuario.id)))
    if result.scalar() > 0:
        return  # Ya hay datos, no hacer nada

    logger.info("📦 Primera ejecución detectada — creando datos iniciales de demo...")

    # 1. Crear Workspace de demo
    ws = Workspace(
        nombre="Escribanía Demo",
        descripcion="Workspace de demostración. Podés renombrarlo en Configuración."
    )
    db_session.add(ws)
    await db_session.flush()

    # 2. Crear usuario administrador por defecto
    admin = Usuario(
        email="admin@ofisolve.com",
        hashed_password=get_password_hash("admin123"),
        nombre_completo="Escribano/a Demo",
        nro_matricula="001",
        escribania_nombre="Escribanía Demo",
        workspace_id=ws.id,
        rol="Escribano",
        is_active=True,
        is_superuser=True,
    )
    db_session.add(admin)
    await db_session.flush()

    # 3. Clientes de ejemplo
    cliente1 = Cliente(
        workspace_id=ws.id,
        nombre_completo="Juan Carlos Pérez",
        dni="35123456",
        cuit="20-35123456-7",
        email="jperez@ejemplo.com",
        telefono="11-1234-5678",
        domicilio="Av. Corrientes 1234, CABA",
        tipo_persona="Fisica",
    )
    cliente2 = Cliente(
        workspace_id=ws.id,
        nombre_completo="María Elena Rodríguez",
        dni="28987654",
        cuit="27-28987654-3",
        email="mrodriguez@ejemplo.com",
        telefono="11-8765-4321",
        domicilio="Av. Santa Fe 500, CABA",
        tipo_persona="Fisica",
    )
    cliente3 = Cliente(
        workspace_id=ws.id,
        nombre_completo="Constructora Horizonte S.A.",
        dni="30714523610",
        cuit="30-71452361-0",
        email="admin@horizonte.com.ar",
        tipo_persona="Juridica",
    )
    db_session.add_all([cliente1, cliente2, cliente3])
    await db_session.flush()

    # 4. Trámites de ejemplo
    tramite1 = Tramite(
        workspace_id=ws.id,
        cliente_id=cliente1.id,
        nombre="Certificación de Firma — Pérez",
        tipo="Certificación de Firma",
        estado="abierto",
        descripcion="Certificación de firma para compraventa de inmueble.",
    )
    tramite2 = Tramite(
        workspace_id=ws.id,
        cliente_id=cliente2.id,
        nombre="Autorización de Viaje — Rodríguez",
        tipo="Autorización de Viaje",
        estado="abierto",
        descripcion="Autorización de viaje al exterior para menor de edad.",
    )
    tramite3 = Tramite(
        workspace_id=ws.id,
        cliente_id=cliente3.id,
        nombre="Poder General — Horizonte S.A.",
        tipo="Poder General",
        estado="completado",
        descripcion="Poder general amplio otorgado por Constructora Horizonte S.A.",
    )
    db_session.add_all([tramite1, tramite2, tramite3])
    await db_session.flush()

    # 5. Participaciones
    db_session.add_all([
        Participacion(cliente_id=cliente1.id, tramite_id=tramite1.id, rol="Requirente"),
        Participacion(cliente_id=cliente2.id, tramite_id=tramite2.id, rol="Autorizante"),
        Participacion(cliente_id=cliente3.id, tramite_id=tramite3.id, rol="Poderdante"),
    ])

    await db_session.commit()
    logger.success("✅ Datos iniciales de demo creados correctamente.")
    logger.info("   👤 Usuario: admin@ofisolve.com / Contraseña: admin123")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la aplicación."""
    from app.core.database import AsyncSessionLocal
    import asyncio

    setup_logging()
    settings = get_settings()

    max_retries = 5
    retry_delay = 2
    for i in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.success("✅ Conexión a Base de Datos Local ESTABLECIDA.")
            break
        except Exception as e:
            if i < max_retries - 1:
                logger.warning(f"⚠️ Reintentando conexión ({i+1}/{max_retries}) en {retry_delay}s...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"❌ FALLO crítico de conexión: {str(e)}")

    # Seed de datos iniciales (solo si la DB está vacía)
    async with AsyncSessionLocal() as db:
        await _seed_initial_data(db)

    logger.info(
        "OfiSolve Backend iniciado",
        env=settings.app_env,
        sovereign_mode=True,
    )

    yield

    logger.info("OfiSolve Backend cerrando")


# ============================================================
# Instancia de la aplicación
# ============================================================

app = FastAPI(
    title="OfiSolve API",
    description=(
        "Sistema de IA para automatización de documentos notariales. "
        "Genera certificaciones, autorizaciones y poderes con anonimización "
        "de datos PII integrada. Human-in-the-Loop obligatorio."
    ),
    version="0.3.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ============================================================
# Rate Limiting & Security Middleware
# ============================================================

from app.api.dependencies import limiter

settings = get_settings()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers — Un único punto de registro, sin duplicados
# ============================================================

app.include_router(auth_router,           prefix="/api/v1/auth",         tags=["Autenticación"])
app.include_router(certificacion_router,  prefix="/api/v1/generate",     tags=["Generación de Documentos"])
app.include_router(clientes_router,       prefix="/api/v1/clientes",     tags=["Clientes"])
app.include_router(workspaces_router,     prefix="/api/v1/workspaces",   tags=["Workspaces"])
app.include_router(tramites_router,       prefix="/api/v1/tramites",     tags=["Trámites & Chat"])
app.include_router(export_router,         prefix="/api/v1/export",       tags=["Exportación"])


# ============================================================
# Endpoints raíz
# ============================================================

@app.get("/", tags=["Sistema"])
async def root():
    return {
        "sistema": "OfiSolve",
        "version": "0.3.0",
        "descripcion": "Sistema de IA Notarial — Soberanía de datos local",
        "docs": "/docs",
        "estado": "operativo",
    }


@app.get("/health", tags=["Sistema"])
async def health():
    """Health check global del sistema."""
    import httpx
    ollama_status = "unknown"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama_status = "online" if r.status_code == 200 else "error"
    except Exception:
        ollama_status = "offline"

    return {
        "status": "healthy",
        "version": "0.3.0",
        "services": {
            "api": "ok",
            "privacy_engine": "active (presidio)",
            "llm": f"ollama ({settings.ollama_llm_model}) — {ollama_status}",
            "database": "sqlite (local)",
            "rag": "chromadb (local)",
        },
        "ollama": {
            "status": ollama_status,
            "model": settings.ollama_llm_model,
            "embedding_model": settings.ollama_embedding_model,
        }
    }


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
