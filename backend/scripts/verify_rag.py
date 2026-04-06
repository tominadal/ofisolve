import sys
import os
import asyncio
from loguru import logger

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.rag_service import RAGService
from app.core.config import get_settings

async def verify_rag():
    rag = RAGService()
    # Para PGVector, no hay un metodo .count() directo en RAGService,
    # pero podemos intentar una busqueda amplia
    try:
        context = rag.buscar_contexto("Ley 404 CABA", n_resultados=5)
        if context:
            logger.success("Verificacion exitosa: Se recupero contexto del RAG.")
            print("\n--- MUESTRA DE CONTEXTO RECUPERADO ---")
            print(context[:500] + "...")
        else:
            logger.error("Error: No se recupero contexto. La base de vectores podria estar vacia.")
    except Exception as e:
        logger.error(f"Fallo en la verificacion: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify_rag())
