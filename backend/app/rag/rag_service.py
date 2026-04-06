"""
Servicio RAG (Retrieval-Augmented Generation) con ChromaDB.

Ingesta la base de conocimiento legal en ChromaDB (local, sin Docker)
y provee búsqueda semántica para contextualizar los prompts del LLM.

ChromaDB corre 100% local, embebido en el proceso Python.
Los embeddings se generan vía Gemini (models/text-embedding-004).

Flujo:
  1. ingestar_documentos() → Carga knowledge_base.py en ChromaDB
  2. buscar_contexto() → Dado un query, retorna chunks de normativa relevantes
  3. El contexto se inyecta en el prompt del LLM antes de generar
"""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger

from app.core.config import get_settings
from app.rag.knowledge_base import DOCUMENTOS_RAG


class RAGService:
    """
    Servicio de Retrieval-Augmented Generation con ChromaDB local.
    
    Almacena normativa notarial como embeddings y permite búsqueda
    semántica para contextualizar las respuestas del LLM.
    
    Uso:
        service = RAGService()
        service.ingestar_documentos()  # Una vez, al arrancar
        contexto = service.buscar_contexto("certificación de fotocopia")
    """

    def __init__(self) -> None:
        """Inicializa el motor de vectores (ChromaDB local o Postgres)."""
        settings = get_settings()
        self._is_postgres = settings.is_postgres
        self._collection_name = settings.chroma_collection
        self._embedding_fn = None
        self._client = None
        self._collection = None
        self._vector_store = None # Para LangChain PGVector si se usa

        if self._is_postgres:
            logger.info("RAG Service: Iniciando en modo PostgreSQL (pgvector)")
        else:
            # Directorio donde ChromaDB persiste los datos
            self._persist_dir = Path(settings.chroma_persist_dir)
            self._persist_dir.mkdir(parents=True, exist_ok=True)

            # Inicializar ChromaDB con persistencia local
            self._client = chromadb.PersistentClient(
                path=str(self._persist_dir),
            )

            # Obtener o crear la colección
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                metadata={"description": "Normativa notarial argentina para RAG"},
            )
            logger.info(
                "RAG Service inicializado (ChromaDB local)",
                persist_dir=str(self._persist_dir),
                collection=self._collection_name,
            )

        # Text splitter para dividir documentos largos en chunks
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " "],
            length_function=len,
        )

    def _inicializar_embeddings_gemini(self) -> None:
        """Inicializa el modelo de embeddings de Gemini (lazy)."""
        if self._embedding_fn is not None:
            return

        settings = get_settings()
        if not settings.google_api_key or settings.google_api_key.startswith("tu-api-key"):
            logger.warning("GOOGLE_API_KEY no configurada. RAG usará embeddings default.")
            return

        try:
            if self._is_postgres:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                from langchain_postgres import PGVector
                
                self._embedding_fn = GoogleGenerativeAIEmbeddings(
                    model=settings.embedding_model,
                    google_api_key=settings.google_api_key
                )
                
                # Sincronizar con Postgres (usando la URL final adaptada)
                connection = settings.final_database_url
                self._vector_store = PGVector(
                    embeddings=self._embedding_fn,
                    collection_name=self._collection_name,
                    connection=connection,
                    use_jsonb=True,
                )
                logger.info("RAG Service: PGVector (Postgres) inicializado correctamente")
            else:
                from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction
                self._embedding_fn = GoogleGenerativeAiEmbeddingFunction(
                    api_key=settings.google_api_key,
                    model_name=settings.embedding_model,
                )
                # Re-vincular colección con embeddings
                self._collection = self._client.get_or_create_collection(
                    name=self._collection_name,
                    embedding_function=self._embedding_fn,
                    metadata={"description": "Normativa notarial argentina para RAG"},
                )
                logger.info("RAG Service: ChromaDB con Gemini Embeddings inicializado")
                
        except Exception as e:
            logger.error(f"Error al inicializar embeddings: {str(e)}")
            if not self._is_postgres:
                logger.warning("Usando embeddings default de ChromaDB")

    def reset_collection(self) -> bool:
        """Limpia todos los vectores de la colección actual."""
        if self._is_postgres:
            try:
                from sqlalchemy import text
                from app.core.database import engine
                
                async def _empty_table():
                    async with engine.begin() as conn:
                        # Verificar si las tablas existen antes de truncar
                        check_sql = "SELECT to_regclass('public.langchain_pg_embedding')"
                        result = await conn.execute(text(check_sql))
                        exists = result.scalar()
                        if exists:
                            await conn.execute(text("TRUNCATE TABLE langchain_pg_embedding CASCADE"))
                            await conn.execute(text("TRUNCATE TABLE langchain_pg_collection CASCADE"))
                            return True
                        return False
                
                import asyncio
                res = False
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # Si estamos en un loop (p.ej. FastAPI), esto podría ser complejo
                        # Pero para scripts, solemos estar fuera.
                        logger.warning("RAG: Intentando reset dentro de un loop activo")
                        res = asyncio.run_coroutine_threadsafe(_empty_table(), loop).result()
                    else:
                        res = loop.run_until_complete(_empty_table())
                except Exception:
                    res = asyncio.run(_empty_table())
                
                if res:
                    logger.warning(f"RAG: Colección {self._collection_name} reseteada en Postgres")
                else:
                    logger.info("RAG: Las tablas de vectores no existen aún, no es necesario resetear.")
                return True
            except Exception as e:
                logger.error(f"Error reseteando PGVector: {str(e)}")
                return False
        else:
            try:
                self._client.delete_collection(self._collection_name)
                self._inicializar_embeddings_gemini()
                logger.warning(f"RAG: Colección {self._collection_name} reseteada en ChromaDB")
                return True
            except Exception as e:
                logger.error(f"Error reseteando ChromaDB: {str(e)}")
                return False

    def ingestar_documentos(self, forzar: bool = False) -> int:
        """Ingesta documentos en el vector store seleccionado."""
        audit_logger = logger.bind(audit=True)
        self._inicializar_embeddings_gemini()

        if forzar:
            self.reset_collection()

        if self._is_postgres:
            from langchain_core.documents import Document
            
            all_docs = []
            for doc_data in DOCUMENTOS_RAG:
                chunks = self._splitter.split_text(doc_data["contenido"])
                for i, text in enumerate(chunks):
                    all_docs.append(Document(
                        page_content=text,
                        metadata={
                            "titulo": doc_data["titulo"],
                            "fuente": doc_data["fuente"],
                            "tipo": doc_data["tipo"],
                            "jurisdiccion": doc_data["jurisdiccion"],
                            "chunk_index": i
                        }
                    ))
            
            if self._vector_store:
                # PGVector add_documents es síncrono en la versión actual de langchain-postgres
                self._vector_store.add_documents(all_docs)
                audit_logger.info("Ingestión en Postgres (pgvector) completada", total=len(all_docs))
                return len(all_docs)
            else:
                logger.error("No se pudo iniciar VectorStore. Verifique GOOGLE_API_KEY.")
                return 0

        else:
            # Lógica original de ChromaDB
            count_actual = self._collection.count()
            if count_actual > 0 and not forzar:
                return count_actual

            if forzar and count_actual > 0:
                self._client.delete_collection(self._collection_name)
                self._inicializar_embeddings_gemini()
                self._collection = self._client.get_or_create_collection(
                    name=self._collection_name,
                    embedding_function=self._embedding_fn,
                )

            total_chunks = 0
            for doc in DOCUMENTOS_RAG:
                chunks = self._splitter.split_text(doc["contenido"])
                ids = [f"{doc['tipo']}_{doc['jurisdiccion']}_{i}" for i in range(len(chunks))]
                metadatas = [{"titulo": doc["titulo"], "fuente": doc["fuente"], "tipo": doc["tipo"], "jurisdiccion": doc["jurisdiccion"]} for i in range(len(chunks))]
                self._collection.add(documents=chunks, ids=ids, metadatas=metadatas)
                total_chunks += len(chunks)
            
            return total_chunks

    def buscar_contexto(self, query: str, n_resultados: int = 5, **kwargs) -> str:
        """Busca contexto relevante."""
        self._inicializar_embeddings_gemini()
        
        try:
            if self._is_postgres and self._vector_store:
                docs = self._vector_store.similarity_search(query, k=n_resultados)
                contexto_parts = [f"[Fuente: {d.metadata.get('fuente')}] {d.page_content}" for d in docs]
                return "\n\n".join(contexto_parts)
            elif self._collection:
                # Lógica ChromaDB
                resultados = self._collection.query(query_texts=[query], n_results=n_resultados)
                if not resultados or not resultados["documents"][0]: return ""
                contexto_parts = [f"[Fuente: {m.get('fuente')}] {d}" for d, m in zip(resultados["documents"][0], resultados["metadatas"][0])]
                return "\n\n".join(contexto_parts)
            return ""
        except Exception as e:
            logger.error(f"Error en RAG Search: {str(e)}")
            return ""

    def get_stats(self) -> dict:
        """Estadísticas básicas."""
        return {
            "modo": "PostgreSQL (pgvector)" if self._is_postgres else "ChromaDB (local)",
            "coleccion": self._collection_name,
            "usa_gemini": self._embedding_fn is not None
        }

