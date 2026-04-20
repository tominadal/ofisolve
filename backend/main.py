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
from app.models.db_models import Usuario, Cliente, Tramite, Participacion # Modelos Unificados SaaS
from app.api.auth import router as auth_router
from app.api.routes_upload import router as upload_router
from app.api.routes_certificacion import router as certificacion_router
from app.api.routes_clientes import router as clientes_router
from app.api.routes_workspaces import router as workspaces_router
from app.api.routes_tramites import router as tramites_router
from app.api.routes_export import router as export_router
from app.api.routes_portal import router as portal_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Ciclo de vida de la aplicación SaaS.
    """
    from app.core.database import engine, AsyncSessionLocal
    
    # --- Startup ---
    setup_logging()
    settings = get_settings()
    
    # Intento de conexión con reintentos (Fase 7: Robustez)
    import asyncio
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

    logger.info(
        "OfiSolve SaaS Backend iniciado",
        env=settings.app_env,
        sovereign_mode=True,
    )

    yield

    # --- Shutdown ---
    logger.info("OfiSolve SaaS Backend cerrando")


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
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Routers
# ============================================================

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(upload_router, prefix="/api/v1", tags=["Librería y Carga"])
app.include_router(certificacion_router, prefix="/api/v1/generate", tags=["Generación de Documentos"])
app.include_router(clientes_router, prefix="/api/v1/clientes", tags=["Clientes"])
app.include_router(workspaces_router, prefix="/api/v1/workspaces", tags=["Workspaces"])
app.include_router(tramites_router, prefix="/api/v1/tramites", tags=["Trámites & Chat Streaming"])
app.include_router(export_router, prefix="/api/v1/export", tags=["Exportación"])
app.include_router(portal_router, prefix="/api/v1/portal", tags=["Portal UI Helpers"])


# ============================================================
# Endpoint raíz
# ============================================================

@app.get("/", tags=["Sistema"])
async def root():
    """Endpoint raíz con información básica del sistema."""
    return {
        "sistema": "OfiSolve SaaS",
        "version": "0.2.0",
        "descripcion": "Sistema de IA Notarial - Automatización con Grafo de Agentes",
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
            "privacy_engine": "active",
            "llm": "ollama (llama3.1)",
            "database": "sqlite/postgresql",
            "rag": "enabled",
        },
    }
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
