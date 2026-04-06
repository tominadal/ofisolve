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
        """Inicializa ChromaDB local y el text splitter."""
        settings = get_settings()

        # Directorio donde ChromaDB persiste los datos
        self._persist_dir = Path(settings.chroma_persist_dir)
        self._persist_dir.mkdir(parents=True, exist_ok=True)

        self._collection_name = settings.chroma_collection
        self._embedding_fn = None

        # Inicializar ChromaDB con persistencia local
        self._client = chromadb.PersistentClient(
            path=str(self._persist_dir),
        )

        # Obtener o crear la colección
        self._collection = self._client.get_or_create_collection(
            name=self._collection_name,
            metadata={"description": "Normativa notarial argentina para RAG"},
        )

        # Text splitter para dividir documentos largos en chunks
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,        # ~250 palabras por chunk
            chunk_overlap=150,      # Solapamiento para no perder contexto
            separators=["\n\n", "\n", ". ", " "],
            length_function=len,
        )

        logger.info(
            "RAG Service inicializado (ChromaDB local)",
            persist_dir=str(self._persist_dir),
            collection=self._collection_name,
            documentos_existentes=self._collection.count(),
        )

    def _inicializar_embeddings_gemini(self) -> None:
        """Inicializa el modelo de embeddings de Gemini (lazy)."""
        if self._embedding_fn is not None:
            return

        settings = get_settings()
        if not settings.google_api_key or settings.google_api_key.startswith("tu-api-key"):
            logger.warning(
                "GOOGLE_API_KEY no configurada. RAG usará embeddings default de ChromaDB."
            )
            return

        try:
            from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction

            self._embedding_fn = GoogleGenerativeAiEmbeddingFunction(
                api_key=settings.google_api_key,
                model_name=settings.embedding_model,
            )

            # Recrear la colección con la función de embeddings
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                embedding_function=self._embedding_fn,
                metadata={"description": "Normativa notarial argentina para RAG"},
            )

            logger.info(
                "Embeddings de Gemini inicializados",
                modelo=settings.embedding_model,
            )
        except Exception as e:
            logger.warning(
                "No se pudieron inicializar embeddings de Gemini. "
                "Usando embeddings default de ChromaDB.",
                error=str(e),
            )

    def ingestar_documentos(self, forzar: bool = False) -> int:
        """
        Ingesta la base de conocimiento legal en ChromaDB.
        
        Toma los documentos de knowledge_base.py, los divide en chunks,
        genera embeddings y los almacena en la colección.
        
        Args:
            forzar: Si True, borra la colección existente y reingesta todo.
            
        Returns:
            Cantidad de chunks ingestados.
        """
        audit_logger = logger.bind(audit=True)

        # Verificar si ya hay datos ingestados
        count_actual = self._collection.count()
        if count_actual > 0 and not forzar:
            audit_logger.info(
                "La colección ya tiene documentos. Saltando ingestión.",
                documentos=count_actual,
            )
            return count_actual

        # Si se fuerza, borrar y recrear
        if forzar and count_actual > 0:
            self._client.delete_collection(self._collection_name)
            self._inicializar_embeddings_gemini()
            self._collection = self._client.get_or_create_collection(
                name=self._collection_name,
                embedding_function=self._embedding_fn,
                metadata={"description": "Normativa notarial argentina para RAG"},
            )
            audit_logger.info("Colección borrada. Reingestando.")

        # Inicializar embeddings si hay API key disponible
        self._inicializar_embeddings_gemini()

        total_chunks = 0

        for doc in DOCUMENTOS_RAG:
            # Dividir el contenido en chunks
            chunks = self._splitter.split_text(doc["contenido"])

            # Preparar datos para ChromaDB
            ids = [f"{doc['tipo']}_{doc['jurisdiccion']}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "titulo": doc["titulo"],
                    "fuente": doc["fuente"],
                    "tipo": doc["tipo"],
                    "jurisdiccion": doc["jurisdiccion"],
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
                for i in range(len(chunks))
            ]

            # Insertar en ChromaDB
            self._collection.add(
                documents=chunks,
                ids=ids,
                metadatas=metadatas,
            )

            total_chunks += len(chunks)

            audit_logger.debug(
                "Documento ingestado",
                titulo=doc["titulo"],
                chunks=len(chunks),
            )

        audit_logger.info(
            "Ingestión completada",
            documentos_fuente=len(DOCUMENTOS_RAG),
            chunks_totales=total_chunks,
        )

        return total_chunks

    def buscar_contexto(
        self,
        query: str,
        n_resultados: int = 5,
        tipo_filtro: Optional[str] = None,
        jurisdiccion_filtro: Optional[str] = None,
        fuentes_seleccionadas: Optional[List[str]] = None,
    ) -> str:
        """
        Busca normativa relevante para contextualizar el prompt del LLM.
        
        Args:
            query: Texto de búsqueda (ej: "certificación de fotocopia").
            n_resultados: Cantidad máxima de chunks a retornar.
            tipo_filtro: Filtrar por tipo ("legislacion" o "procedimiento").
            jurisdiccion_filtro: Filtrar por jurisdicción ("nacional" o "caba").
            
        Returns:
            Texto concatenado con los chunks más relevantes, formateado
            para inyectar en el prompt del LLM.
        """
        # Construir filtros opcionales
        where_filter = {}
        
        # Combinar filtros de forma logica si es necesario
        and_conditions = []
        
        if tipo_filtro:
            and_conditions.append({"tipo": tipo_filtro})
        if jurisdiccion_filtro:
            and_conditions.append({"jurisdiccion": jurisdiccion_filtro})
        if fuentes_seleccionadas and len(fuentes_seleccionadas) > 0:
            and_conditions.append({"titulo": {"$in": fuentes_seleccionadas}})
            
        if len(and_conditions) == 1:
            where_filter = and_conditions[0]
        elif len(and_conditions) > 1:
            where_filter = {"$and": and_conditions}

        try:
            # Buscar en ChromaDB
            resultados = self._collection.query(
                query_texts=[query],
                n_results=n_resultados,
                where=where_filter if where_filter else None,
            )

            if not resultados or not resultados["documents"] or not resultados["documents"][0]:
                logger.warning("Sin resultados de RAG para el query", query=query[:100])
                return ""

            # Formatear resultados para el prompt
            contexto_parts = []
            for i, (doc, meta) in enumerate(
                zip(resultados["documents"][0], resultados["metadatas"][0])
            ):
                contexto_parts.append(
                    f"[Fuente: {meta['fuente']} — {meta['titulo']}]\n{doc}"
                )

            contexto = "\n\n".join(contexto_parts)

            logger.info(
                "Contexto RAG obtenido",
                query=query[:80],
                chunks_encontrados=len(resultados["documents"][0]),
            )

            return contexto

        except Exception as e:
            logger.error(
                "Error en búsqueda RAG. Continuando sin contexto.",
                error=str(e),
            )
            return ""

    def agregar_documento_dinamico(
        self, 
        contenido: str, 
        nombre: str, 
        tipo_doc: str = "legislacion", 
        jurisdiccion: str = "caba"
    ) -> int:
        """
        Agrega un nuevo documento a la colección de forma dinámica.
        
        Args:
            contenido: Texto completo del documento.
            nombre: Título del documento.
            tipo_doc: Categoría del documento.
            jurisdiccion: Ámbito legal.
            
        Returns:
            Cantidad de chunks agregados.
        """
        self._inicializar_embeddings_gemini()
        
        chunks = self._splitter.split_text(contenido)
        ids = [f"dyn_{nombre}_{i}_{datetime.now().timestamp()}" for i in range(len(chunks))]
        metadatas = [
            {
                "titulo": nombre,
                "fuente": "Carga de Usuario",
                "tipo": tipo_doc,
                "jurisdiccion": jurisdiccion,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "dinamico": True
            }
            for i in range(len(chunks))
        ]
        
        self._collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        
        logger.info(
            "Documento dinámico ingestado",
            nombre=nombre,
            chunks=len(chunks)
        )
        return len(chunks)

    def get_stats(self) -> dict:
        """Retorna estadísticas del estado del RAG."""
        return {
            "total_documentos": self._collection.count(),
            "collection": self._collection_name,
            "persist_dir": str(self._persist_dir),
            "usa_gemini_embeddings": self._embedding_fn is not None,
        }
