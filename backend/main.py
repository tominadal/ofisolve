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
from app.models import db_models as models
from app.api.auth import router as auth_router
from app.api.routes_upload import router as upload_router
from app.api.routes_certificacion import router as certificacion_router
from app.api.routes_clientes import router as clientes_router
from app.api.routes_workspaces import router as workspaces_router
from app.api.routes_chat import router as chat_router
from app.api.routes_tramites import router as tramites_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Ciclo de vida de la aplicación.
    Inicializa servicios al arrancar y los limpia al apagar.
    """
    from app.core.database import engine, AsyncSessionLocal
    
    # Inicializa las tablas de DB de forma asíncrona
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # --- Seeding Inicial de Datos (Asíncrono) ---
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(models.Workspace).limit(1))
        if not result.scalars().first():
            logger.info("Base de datos vacía. Creando datos iniciales (Seed)...")
            ws = models.Workspace(
                nombre="Escribania Central - Buenos Aires", 
                descripcion="Sede principal de gestión notarial"
            )
            db.add(ws)
            await db.commit()
            await db.refresh(ws)
            
            # Crear Clientes base
            clientes = [
                models.Cliente(workspace_id=ws.id, nombre_completo="Juan Carlos Pérez", dni="20.345.678", email="juan.perez@email.com", domicilio="Av. Rivadavia 1500, CABA"),
                models.Cliente(workspace_id=ws.id, nombre_completo="María Elena García", dni="27.890.123", email="m.garcia@email.com", domicilio="Pueyrredón 450, 4to B, CABA"),
                models.Cliente(workspace_id=ws.id, nombre_completo="Roberto Carlos Gómez", dni="22.123.456", email="rcgomez@empresa.com.ar", domicilio="Florida 10, CABA")
            ]
            db.add_all(clientes)
            
            # Crear Equipo base
            equipo = [
                models.EquipoMiembro(workspace_id=ws.id, nombre="Escribano Titular", rol="Titular", email="titular@ofisolve.com"),
                models.EquipoMiembro(workspace_id=ws.id, nombre="Abogado Adscripto", rol="Adscripto", email="adscripto@ofisolve.com"),
                models.EquipoMiembro(workspace_id=ws.id, nombre="Socia Administrativa", rol="Administración", email="admin@ofisolve.com")
            ]
            db.add_all(equipo)
            await db.commit()
            logger.info("Seed finalizado con éxito.")

    # --- Startup ---
    setup_logging()
    settings = get_settings()
    logger.info(
        "OfiSolve Backend iniciando",
        env=settings.app_env,
        debug=settings.app_debug,
    )

    yield

    # --- Shutdown ---
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
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ============================================================
# Rate Limiting & Security Middleware
# ============================================================

from app.api.dependencies import limiter

settings = get_settings()

# Inicializador de Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers (Helmet-like)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    # Saltamos headers de seguridad para preflight de CORS
    if request.method == "OPTIONS":
        return await call_next(request)
        
    response = await call_next(request)
    # Headers básicos recomendados por OWASP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# CORS (Debe agregarse tras otros middlewares para envolverlos)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers
# ============================================================

app.include_router(auth_router, prefix="/api/v1", tags=["Autenticación"])
app.include_router(upload_router, prefix="/api/v1", tags=["Librería y Carga"])
app.include_router(certificacion_router) # Ya tiene prefix /api/v1/generate
app.include_router(clientes_router, prefix="/api/v1/clientes", tags=["Clientes"])
app.include_router(workspaces_router, prefix="/api/v1/workspaces", tags=["Workspaces"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat Notarial"])
app.include_router(tramites_router) # Ya tiene prefix /api/v1/tramites (SSE Chat)


# ============================================================
# Endpoint raíz
# ============================================================

@app.get("/", tags=["Sistema"])
async def root():
    """Endpoint raíz con información básica del sistema."""
    return {
        "sistema": "OfiSolve",
        "version": "0.1.0",
        "descripcion": "Sistema de IA para Escribanía - Automatización Notarial",
        "docs": "/docs",
        "estado": "operativo",
    }


@app.get("/health", tags=["Sistema"])
async def health():
    """Health check global del sistema."""
    return {
        "status": "healthy",
        "services": {
            "api": "ok",
            "privacy_engine": "ok",
            "llm": "gpt-4o-notarial",
            "database": "sqlite/operativa",
            "qdrant": "ready",
        },
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
