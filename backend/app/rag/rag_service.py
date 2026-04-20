"""
Servicio RAG (Retrieval-Augmented Generation) con ChromaDB.

Ingesta la base de conocimiento legal en ChromaDB (local, sin Docker)
y provee búsqueda semántica para contextualizar los prompts del LLM.

ChromaDB corre 100% local, embebido en el proceso Python.
Soporta múltiples proveedores de embeddings (Gemini u Ollama local).
"""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger

from app.core.config import get_settings
from app.rag.knowledge_base import DOCUMENTOS_RAG


class RAGService:
    """
    Servicio de Retrieval-Augmented Generation con ChromaDB local.
    
    Almacena normativa notarial como embeddings y permite búsqueda
    semántica para contextualizar las respuestas del LLM.
    """

    def __init__(self) -> None:
        """Inicializa el motor de vectores (ChromaDB local o Postgres)."""
        settings = get_settings()
        self._is_postgres = settings.is_postgres
        self._collection_name = settings.chroma_collection
        self._embedding_fn = None
        self._client = None
        self._collection = None
        self._vector_store = None

        if self._is_postgres:
            logger.info("RAG Service: Iniciando en modo PostgreSQL (pgvector)")
        else:
            self._persist_dir = Path(settings.chroma_persist_dir)
            self._persist_dir.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(self._persist_dir))
            self._collection = None 

        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=150,
            separators=["\n\n", "\n", ". ", " "],
            length_function=len,
        )

    def _inicializar_embeddings(self) -> None:
        """Inicializa el modelo de embeddings según el proveedor activo (lazy)."""
        if self._embedding_fn is not None:
            return

        settings = get_settings()
        
        try:
            if settings.ai_provider == "ollama":
                logger.info(f"RAG Service: Usando Ollama ({settings.ollama_embedding_model})")
                
                if self._is_postgres:
                    from langchain_ollama import OllamaEmbeddings
                    from langchain_postgres import PGVector
                    self._embedding_fn = OllamaEmbeddings(
                        model=settings.ollama_embedding_model,
                        base_url=settings.ollama_base_url
                    )
                    self._vector_store = PGVector(
                        embeddings=self._embedding_fn,
                        collection_name=self._collection_name,
                        connection=settings.final_database_url,
                        use_jsonb=True,
                    )
                else:
                    from chromadb.utils.embedding_functions import OllamaEmbeddingFunction
                    self._embedding_fn = OllamaEmbeddingFunction(
                        model_name=settings.ollama_embedding_model,
                        url=f"{settings.ollama_base_url}/api/embeddings"
                    )
                    self._collection = self._client.get_or_create_collection(
                        name=self._collection_name,
                        embedding_function=self._embedding_fn,
                    )
                logger.info("RAG Service: Embeddings de Ollama listos.")

            else:
                logger.warning(f"RAG Service: Proveedor {settings.ai_provider} no soporta embeddings específicos. Usando default de Chroma.")
                
        except Exception as e:
            logger.error(f"Error al inicializar embeddings RAG: {str(e)}")
            if not self._is_postgres:
                # Caso extremo: Base de datos local corrupta (KeyError: '_type' o similar)
                if "KeyError" in str(e) or "type" in str(e):
                    logger.warning("Detectada posible corrupción en ChromaDB. Intentando limpieza forzada...")
                    try:
                        import shutil
                        shutil.rmtree(self._persist_dir, ignore_errors=True)
                        self._persist_dir.mkdir(parents=True, exist_ok=True)
                        self._client = chromadb.PersistentClient(path=str(self._persist_dir))
                        self._collection = self._client.get_or_create_collection(name=self._collection_name)
                        logger.success("ChromaDB regenerado exitosamente.")
                        return
                    except Exception as re:
                        logger.error(f"Fallo crítico al reconstruir ChromaDB: {str(re)}")
                
                logger.warning("Revirtiendo a embeddings default de ChromaDB")
                try:
                    self._collection = self._client.get_or_create_collection(name=self._collection_name)
                except:
                    pass

    def reset_collection(self) -> bool:
        """Limpia todos los vectores de la colección actual."""
        if self._is_postgres:
            try:
                from sqlalchemy import text
                from app.core.database import engine
                import asyncio
                
                async def _empty_table():
                    async with engine.begin() as conn:
                        check_sql = "SELECT to_regclass('public.langchain_pg_embedding')"
                        result = await conn.execute(text(check_sql))
                        if result.scalar():
                            await conn.execute(text("TRUNCATE TABLE langchain_pg_embedding CASCADE"))
                            await conn.execute(text("TRUNCATE TABLE langchain_pg_collection CASCADE"))
                            return True
                        return False
                
                # Ejecución de async en contexto sync (RAG es consumido mayormente así)
                try:
                    res = asyncio.run(_empty_table())
                except RuntimeError: # Ya hay un event loop
                    loop = asyncio.get_event_loop()
                    res = loop.run_until_complete(_empty_table())
                return res
            except Exception as e:
                logger.error(f"Error reseteando PGVector: {str(e)}")
                return False
        else:
            try:
                self._client.delete_collection(self._collection_name)
                self._embedding_fn = None 
                self._inicializar_embeddings()
                return True
            except Exception as e:
                logger.error(f"Error reseteando ChromaDB: {str(e)}")
                return False

    def ingestar_documentos(self, forzar: bool = False) -> int:
        """Ingesta documentos en el vector store seleccionado."""
        self._inicializar_embeddings()
        audit_logger = logger.bind(audit=True)

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
                        metadata={"titulo": doc_data["titulo"], "fuente": doc_data["fuente"], "tipo": doc_data["tipo"], "jurisdiccion": doc_data["jurisdiccion"], "chunk_index": i}
                    ))
            if self._vector_store:
                self._vector_store.add_documents(all_docs)
                audit_logger.info("Ingestión en Postgres completada", total=len(all_docs))
                return len(all_docs)
            return 0
        else:
            if not self._collection: self._inicializar_embeddings()
            count_actual = self._collection.count()
            if count_actual > 0 and not forzar: return count_actual

            total_chunks = 0
            for doc in DOCUMENTOS_RAG:
                chunks = self._splitter.split_text(doc["contenido"])
                ids = [f"{doc['tipo']}_{doc['jurisdiccion']}_{i}" for i in range(len(chunks))]
                metadatas = [{"titulo": doc["titulo"], "fuente": doc["fuente"], "tipo": doc["tipo"], "jurisdiccion": doc["jurisdiccion"]} for _ in range(len(chunks))]
                self._collection.add(documents=chunks, ids=ids, metadatas=metadatas)
                total_chunks += len(chunks)
            
            audit_logger.info("Ingestión en ChromaDB completada", total=total_chunks)
            return total_chunks

    def buscar_contexto(self, query: str, n_resultados: int = 5, **kwargs) -> str:
        """Busca contexto relevante."""
        self._inicializar_embeddings()
        try:
            if self._is_postgres and self._vector_store:
                docs = self._vector_store.similarity_search(query, k=n_resultados)
                return "\n\n".join([f"[Fuente: {d.metadata.get('fuente')}] {d.page_content}" for d in docs])
            elif self._collection:
                resultados = self._collection.query(query_texts=[query], n_results=n_resultados)
                if not resultados or not resultados["documents"][0]: return ""
                return "\n\n".join([f"[Fuente: {m.get('fuente')}] {d}" for d, m in zip(resultados["documents"][0], resultados["metadatas"][0])])
            return ""
        except Exception as e:
            logger.error(f"Error en RAG Search: {str(e)}")
            return ""

    def get_stats(self) -> dict:
        """Estadísticas básicas del sistema RAG."""
        settings = get_settings()
        self._inicializar_embeddings() # Asegurar carga para contar docs
        return {
            "modo": "PostgreSQL (pgvector)" if self._is_postgres else "ChromaDB (local)",
            "proveedor_ia": settings.ai_provider,
            "embeddings_activos": self._embedding_fn is not None,
            "total_documentos": self._collection.count() if self._collection else 0
        }
