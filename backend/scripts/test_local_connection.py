import asyncio
import sys
import os
from loguru import logger
import httpx

# Añadir el path para importar configuraciones
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.rag.rag_service import RAGService

async def test_all():
    settings = get_settings()
    logger.info("🧪 INICIANDO DIAGNÓSTICO INTEGRAL DE OFISOLVE")
    
    # 1. Verificar GOOGLE_API_KEY
    if not settings.google_api_key:
        logger.error("❌ GOOGLE_API_KEY no encontrada en .env")
    else:
        logger.success("✅ GOOGLE_API_KEY configurada.")

    # 2. Verificar Base de Datos (PostgreSQL)
    from sqlalchemy import text
    from app.core.database import engine
    
    logger.info(f"Conectando a: {settings.final_database_url.split('@')[-1]}...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            logger.success("✅ Conexión a PostgreSQL EXITOSA.")
    except Exception as e:
        logger.error(f"❌ FALLO de conexión a PostgreSQL: {str(e)}")
        logger.info("👉 TIP: Asegúrate de que Docker esté corriendo o que Postgres esté en el puerto 5432.")

    # 3. Verificar RAG
    try:
        rag = RAGService()
        logger.info("Probando búsqueda vectorial (RAG)...")
        # Esto fallará si el punto 2 falló, pero es bueno tener el log específico
        contexto = rag.buscar_contexto("Ley 404 CABA", n_resultados=1)
        if contexto:
            logger.success("✅ Motor RAG operativo y con datos.")
        else:
            logger.warning("⚠️ RAG operativo pero sin datos. Ejecuta 'python scripts/init_rag.py --reset'.")
    except Exception as e:
        logger.error(f"❌ Motor RAG no inicializado: {str(e)}")

    logger.info("--- Diagnóstico Finalizado ---")

if __name__ == "__main__":
    asyncio.run(test_all())
