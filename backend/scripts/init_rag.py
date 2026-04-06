import sys
import os
import argparse
from loguru import logger

# Añadir el path del backend para poder importar modulos de la app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.rag_service import RAGService
from app.core.config import get_settings

def init_rag(reset: bool = False):
    """
    Script para inicializar o resetear la base de conocimientos RAG.
    Uso: python scripts/init_rag.py [--reset]
    """
    settings = get_settings()
    logger.info(f"--- Inicializando RAG (Jurisdicción CABA) ---")
    logger.info(f"Modo: {'PostgreSQL' if settings.is_postgres else 'ChromaDB'}")
    
    rag_service = RAGService()
    
    if reset:
        logger.warning("Solicitud de RESET detectada. Limpiando vectores existentes...")
        rag_service.reset_collection()
    
    logger.info("Iniciando ingesta de documentos desde knowledge_base.py...")
    total_chunks = rag_service.ingestar_documentos(forzar=reset)
    
    logger.success(f"Proceso completado con éxito. Se ingraron {total_chunks} chunks de normativa.")
    logger.info("La IA ahora tiene conocimiento actualizado sobre Ley 404, CECBA, Asentimiento y Sociedades.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inicializar RAG de OfiSolve")
    parser.add_argument("--reset", action="store_true", help="Elimina los vectores actuales antes de ingestar")
    args = parser.parse_args()
    
    try:
        init_rag(reset=args.reset)
    except Exception as e:
        logger.error(f"Fallo crítico en la inicialización de RAG: {str(e)}")
        sys.exit(1)
