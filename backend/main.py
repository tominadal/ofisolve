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
from app.models.db_models import (
    Usuario, Workspace, Cliente, Tramite, Participacion, MensajeChat,
    CategoriaFinanciera, MovimientoFinanciero, Proveedor, Presupuesto,
    PresupuestoItem, EventoAgenda, Nota, ConfiguracionAranceles, PlantillaModelo,
)
from app.api.auth import router as auth_router
from app.api.routes_certificacion import router as certificacion_router
from app.api.routes_clientes import router as clientes_router
from app.api.routes_workspaces import router as workspaces_router
from app.api.routes_tramites import router as tramites_router
from app.api.routes_export import router as export_router
from app.api.routes_sistema import router as sistema_router
from app.api.routes_documentos import router as documentos_router
from app.api.routes_finanzas import router as finanzas_router
from app.api.routes_presupuestos import router as presupuestos_router
from app.api.routes_agenda import router as agenda_router
from app.api.routes_notas import router as notas_router
from app.api.routes_uif import router as uif_router
from app.api.onboarding import router as onboarding_router
from app.api.routes_chat import router as chat_router

# NOTA: routes_upload.py eliminado del main — su lógica fue integrada en routes_workspaces.py
# NOTA: routes_portal.py eliminado — era duplicado exacto de routes_tramites.py


async def _seed_initial_data(db_session) -> None:
    """
    Crea datos iniciales si la base de datos está completamente vacía.
    Esto garantiza que el frontend siempre tenga algo para mostrar en el primer arranque.
    """
    from sqlalchemy import select, func
    from app.core.security import get_password_hash
    import datetime as dt
    from decimal import Decimal

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
        riesgo_uif="Medio",
        uif_estado="En Análisis",
        uif_ultima_revision=dt.datetime.now() - dt.timedelta(days=2)
    )
    cliente3 = Cliente(
        workspace_id=ws.id,
        nombre_completo="Constructora Horizonte S.A.",
        dni="30714523610",
        cuit="30-71452361-0",
        email="admin@horizonte.com.ar",
        tipo_persona="Juridica",
        riesgo_uif="Alto",
        uif_estado="Requiere ROS",
        uif_ultima_revision=dt.datetime.now() - dt.timedelta(days=10)
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

    # ==========================================================================
    # SEED: Módulos ERP Competitivos
    # ==========================================================================

    logger.info("📦 Creando datos de demo para módulos ERP...")

    # --- Categorías Financieras (sistema, no eliminables) ---
    categorias = [
        CategoriaFinanciera(workspace_id=ws.id, nombre="Honorarios", tipo_default="ingreso", color="#10B981", icono="DollarSign", es_sistema=True),
        CategoriaFinanciera(workspace_id=ws.id, nombre="Sellos y Timbrados", tipo_default="egreso", color="#F59E0B", icono="Stamp", es_sistema=True),
        CategoriaFinanciera(workspace_id=ws.id, nombre="Aportes Caja Notarial", tipo_default="egreso", color="#8B5CF6", icono="Building2", es_sistema=True),
        CategoriaFinanciera(workspace_id=ws.id, nombre="Gastos Operativos", tipo_default="egreso", color="#EF4444", icono="Receipt", es_sistema=True),
        CategoriaFinanciera(workspace_id=ws.id, nombre="Gestorías y Trámites", tipo_default="egreso", color="#3B82F6", icono="FileSearch", es_sistema=True),
        CategoriaFinanciera(workspace_id=ws.id, nombre="Otros Ingresos", tipo_default="ingreso", color="#06B6D4", icono="Plus", es_sistema=False),
    ]
    db_session.add_all(categorias)
    await db_session.flush()

    # --- Aranceles Realistas (Colegio de Escribanos CABA - referencia) ---
    aranceles = [
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Honorarios del Escribano", tipo_calculo="porcentaje", valor=Decimal("0.0200"), minimo=Decimal("150000"), aplica_a="todos", orden=1),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Impuesto de Sellos (CABA)", tipo_calculo="porcentaje", valor=Decimal("0.0360"), aplica_a="compraventa", orden=2),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Impuesto de Sellos (CABA)", tipo_calculo="porcentaje", valor=Decimal("0.0240"), aplica_a="hipoteca", orden=2),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Aporte Notarial (Ley 12990)", tipo_calculo="porcentaje", valor=Decimal("0.0050"), aplica_a="todos", orden=3),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Tasa de Justicia", tipo_calculo="porcentaje", valor=Decimal("0.0030"), aplica_a="todos", orden=4),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Certificado de Dominio (RPBA)", tipo_calculo="fijo", valor=Decimal("25000"), aplica_a="compraventa", orden=5),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Certificado de Inhibición", tipo_calculo="fijo", valor=Decimal("18000"), aplica_a="compraventa", orden=6),
        ConfiguracionAranceles(workspace_id=ws.id, concepto="Fojas de Actuación Notarial", tipo_calculo="fijo", valor=Decimal("8500"), aplica_a="todos", orden=7),
    ]
    db_session.add_all(aranceles)

    # --- Proveedores Demo ---
    prov1 = Proveedor(workspace_id=ws.id, nombre_completo="Gestoría Martínez & Asoc.", cuit="20-30456789-1", tipo="Gestor", telefono="11-4567-8901", email="gestoria@martinez.com.ar")
    prov2 = Proveedor(workspace_id=ws.id, nombre_completo="Registro de la Propiedad Inmueble", tipo="Registro", telefono="11-4000-0001")
    prov3 = Proveedor(workspace_id=ws.id, nombre_completo="Perito Ing. Carlos Ruiz", cuit="20-25678901-5", tipo="Perito", email="cruiz@peritos.com.ar")
    db_session.add_all([prov1, prov2, prov3])
    await db_session.flush()

    # --- Movimientos Financieros Demo ---
    hoy = dt.date.today()
    movimientos = [
        MovimientoFinanciero(workspace_id=ws.id, tipo="ingreso", monto=Decimal("850000"), descripcion="Honorarios Escritura Compraventa — Pérez", fecha=hoy - dt.timedelta(days=5), categoria_id=categorias[0].id, cliente_id=cliente1.id, estado="confirmado"),
        MovimientoFinanciero(workspace_id=ws.id, tipo="egreso", monto=Decimal("25000"), descripcion="Certificado de Dominio RPBA", fecha=hoy - dt.timedelta(days=4), categoria_id=categorias[4].id, proveedor_id=prov2.id, estado="confirmado"),
        MovimientoFinanciero(workspace_id=ws.id, tipo="egreso", monto=Decimal("180000"), descripcion="Sellos Provincia de Buenos Aires", fecha=hoy - dt.timedelta(days=3), categoria_id=categorias[1].id, estado="confirmado"),
        MovimientoFinanciero(workspace_id=ws.id, tipo="ingreso", monto=Decimal("120000"), descripcion="Honorarios Certificación de Firma — Horizonte S.A.", fecha=hoy - dt.timedelta(days=1), categoria_id=categorias[0].id, cliente_id=cliente3.id, estado="pendiente"),
        MovimientoFinanciero(workspace_id=ws.id, tipo="egreso", monto=Decimal("45000"), descripcion="Aportes Caja Notarial — Junio 2026", fecha=hoy, categoria_id=categorias[2].id, estado="confirmado"),
    ]
    db_session.add_all(movimientos)

    # --- Presupuesto Demo ---
    presupuesto = Presupuesto(
        workspace_id=ws.id, cliente_id=cliente1.id, titulo="Presupuesto Compraventa Inmueble — Pérez",
        tipo_acto="Compraventa", monto_operacion=Decimal("45000000"), estado="enviado",
        fecha_envio=dt.datetime.utcnow(), observaciones="Inmueble en Av. Rivadavia 1500, CABA.",
    )
    db_session.add(presupuesto)
    await db_session.flush()
    items_presupuesto = [
        PresupuestoItem(presupuesto_id=presupuesto.id, concepto="Honorarios del Escribano", monto=Decimal("900000"), es_porcentaje=True, porcentaje_valor=Decimal("0.0200"), orden=1),
        PresupuestoItem(presupuesto_id=presupuesto.id, concepto="Impuesto de Sellos (CABA)", monto=Decimal("1620000"), es_porcentaje=True, porcentaje_valor=Decimal("0.0360"), orden=2),
        PresupuestoItem(presupuesto_id=presupuesto.id, concepto="Aporte Notarial", monto=Decimal("225000"), es_porcentaje=True, porcentaje_valor=Decimal("0.0050"), orden=3),
        PresupuestoItem(presupuesto_id=presupuesto.id, concepto="Certificado de Dominio", monto=Decimal("25000"), orden=4),
        PresupuestoItem(presupuesto_id=presupuesto.id, concepto="Certificado de Inhibición", monto=Decimal("18000"), orden=5),
    ]
    db_session.add_all(items_presupuesto)

    # --- Eventos de Agenda Demo ---
    ahora = dt.datetime.utcnow()
    eventos = [
        EventoAgenda(workspace_id=ws.id, titulo="Firma Escritura — Pérez", tipo="turno", fecha_inicio=ahora + dt.timedelta(days=3, hours=10), fecha_fin=ahora + dt.timedelta(days=3, hours=11), cliente_id=cliente1.id, color="#3B82F6"),
        EventoAgenda(workspace_id=ws.id, titulo="Vencimiento Certificado Inhibición — Horizonte", tipo="vencimiento", fecha_inicio=ahora + dt.timedelta(days=5), todo_el_dia=True, cliente_id=cliente3.id, color="#F59E0B"),
        EventoAgenda(workspace_id=ws.id, titulo="Audiencia Mediación — Rodríguez", tipo="audiencia", fecha_inicio=ahora + dt.timedelta(days=7, hours=14), fecha_fin=ahora + dt.timedelta(days=7, hours=16), cliente_id=cliente2.id, color="#8B5CF6"),
        EventoAgenda(workspace_id=ws.id, titulo="Recordatorio: Renovar seguro de responsabilidad", tipo="recordatorio", fecha_inicio=ahora + dt.timedelta(days=14), todo_el_dia=True, color="#EF4444"),
    ]
    db_session.add_all(eventos)

    # --- Notas Demo ---
    notas = [
        Nota(workspace_id=ws.id, titulo="Pendiente: Pedir informe catastral", contenido="Para la escritura de Pérez, solicitar informe catastral actualizado al RPCyG.", color="#FEF3C7", visibilidad="equipo", fijada=True),
        Nota(workspace_id=ws.id, titulo="Teléfono Colegio de Escribanos", contenido="Mesa de entradas: 4815-8450\nSecretaría: 4815-8460", color="#DBEAFE", visibilidad="equipo"),
        Nota(workspace_id=ws.id, titulo="Recordar: Actualizar aranceles en julio", contenido="El Colegio publicó nuevos valores, actualizar la tabla de aranceles.", color="#FDE2E2", visibilidad="personal"),
    ]
    db_session.add_all(notas)

    # --- Plantillas/Modelos Demo ---
    plantillas = [
        PlantillaModelo(workspace_id=ws.id, nombre="Modelo Escritura de Compraventa", categoria="escritura", descripcion="Modelo base de escritura de compraventa de inmueble", contenido="ESCRITURA NÚMERO [NRO] — COMPRAVENTA — En la Ciudad Autónoma de Buenos Aires, a los [FECHA], ante mí, Escribano Público [NOMBRE], titular del Registro Notarial Nº [REG]...\n\nCOMPARECEN:\n- VENDEDOR: [NOMBRE], DNI [DNI], domiciliado en [DOMICILIO].\n- COMPRADOR: [NOMBRE], DNI [DNI], domiciliado en [DOMICILIO].\n\nY DICEN: Que el primero vende al segundo el inmueble sito en [DIRECCIÓN], inscripto en la matrícula [MATRÍCULA]...\n\nPRECIO: La operación se realiza por la suma de PESOS [MONTO] ($[MONTO])...\n\nDOY FE."),
        PlantillaModelo(workspace_id=ws.id, nombre="Modelo Certificación de Firma", categoria="certificacion", descripcion="Modelo estándar de certificación de firma", contenido="CERTIFICACIÓN DE FIRMA — En la Ciudad Autónoma de Buenos Aires, a los [FECHA], ante mí, Escribano Público [NOMBRE], se presentó [REQUIRENTE], DNI [DNI], quien firmó en mi presencia el documento que se adjunta.\n\nDOY FE que la firma que antecede es auténtica.", es_favorito=True, uso_count=12),
        PlantillaModelo(workspace_id=ws.id, nombre="Modelo Poder General", categoria="poder", descripcion="Poder general amplio de administración y disposición", contenido="PODER GENERAL AMPLIO — En la Ciudad Autónoma de Buenos Aires, a los [FECHA]...\n\nComparece: [PODERDANTE], DNI [DNI], y confiere poder general amplio a favor de [APODERADO], DNI [DNI], para que en su nombre y representación ejerza actos de administración y disposición..."),
    ]
    db_session.add_all(plantillas)

    await db_session.commit()
    logger.success("✅ Datos ERP de demo creados: categorías, aranceles, proveedores, movimientos, presupuestos, agenda, notas y plantillas.")


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
app.include_router(sistema_router,        prefix="/api/v1/sistema",      tags=["Sistema"])
app.include_router(documentos_router,     prefix="/api/v1/documentos",   tags=["Documentos"])
app.include_router(onboarding_router,     prefix="/api/v1/onboarding",   tags=["Onboarding WEB"])
app.include_router(chat_router,           prefix="/api/v1/chat",         tags=["Chat"])

# --- Módulos ERP Competitivos ---
app.include_router(finanzas_router,       prefix="/api/v1/workspaces",   tags=["Finanzas y Proveedores"])
app.include_router(presupuestos_router,   prefix="/api/v1/workspaces",   tags=["Presupuestos y Aranceles"])
app.include_router(agenda_router,         prefix="/api/v1/workspaces",   tags=["Agenda"])
app.include_router(notas_router,          prefix="/api/v1/workspaces",   tags=["Notas y Plantillas"])
app.include_router(uif_router,            prefix="/api/v1/workspaces",   tags=["UIF"])


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
    
    if settings.ai_provider == "mock":
        ollama_status = "mock"
    else:
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
