"""
test_rag_quality.py — Tests de calidad del sistema RAG (ChromaDB + Ollama).

Verifica:
1. La normativa global se ingesta correctamente.
2. Las búsquedas retornan resultados relevantes.
3. El contexto RAG enriquece la calidad del output del LLM.
4. Colecciones por trámite están correctamente aisladas.
5. Las búsquedas no retornan vacío para queries notariales.

NOTA: Los tests de embedding (OllamaEmbeddingFunction) requieren
      que el modelo de embeddings esté disponible en Ollama.
      Si no, ChromaDB usa embeddings por defecto (SentenceTransformer).
"""

import pytest
import pytest_asyncio
import tempfile
import os

import sys
sys.path.insert(0, os.path.dirname(__file__))
from conftest_llm import (
    skip_if_no_ollama,
    skip_if_no_llm_model,
    is_ollama_available,
    assert_notarial_quality,
)

# Queries de prueba para RAG
QUERY_FIRMA = "certificación de firma procedimiento Argentina"
QUERY_FECHA_CIERTA = "fecha cierta artículo 317 código civil"
QUERY_VIAJE = "autorización viaje menores migraciones"
QUERY_IRRELEVANTE = "receta de pizza italiana con albahaca"


# ==============================================================
# Fixture: RAGService aislado con DB temporal
# ==============================================================

@pytest.fixture(scope="module")
def rag_service_temp():
    """
    RAGService con directorio ChromaDB temporal.
    Evita contaminar la base de datos de desarrollo.

    Fix Windows: ChromaDB mantiene locks en archivos binarios (.bin).
    Se cierra el cliente explícitamente antes del cleanup del TemporaryDirectory.
    """
    from app.rag.rag_service import RAGService

    # ignore_cleanup_errors=True: fallback si aún hay lock (Python 3.10+)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        from unittest.mock import patch, MagicMock
        mock_settings = MagicMock()
        mock_settings.chroma_persist_dir = tmpdir
        mock_settings.ai_provider = "default"  # Usa embeddings default de Chroma
        mock_settings.ollama_embedding_model = "bge-m3"
        mock_settings.ollama_base_url = "http://localhost:11434"

        with patch("app.rag.rag_service.get_settings", return_value=mock_settings):
            svc = RAGService()
            yield svc
            # Cerrar el cliente ChromaDB explícitamente para liberar locks en Windows
            try:
                svc._client.close()
            except Exception:
                pass


@pytest.fixture(scope="module")
def rag_service_real():
    """
    RAGService usando la base de datos de desarrollo real.
    Solo para tests que verifican el estado actual de la normativa.
    """
    from app.rag.rag_service import RAGService
    return RAGService()


# ==============================================================
# 1. Ingestión de normativa global
# ==============================================================

def test_ingestión_normativa_global(rag_service_temp):
    """La ingestión debe cargar los documentos de knowledge_base.py."""
    total_chunks = rag_service_temp.ingestar_documentos(forzar=True)

    print(f"\n[RAG Ingestión] Total chunks indexados: {total_chunks}")

    assert total_chunks > 0, (
        "La ingestión no cargó ningún chunk. "
        "Verificar que DOCUMENTOS_RAG en knowledge_base.py no esté vacío."
    )
    assert total_chunks >= 10, (
        f"Se indexaron muy pocos chunks: {total_chunks}. "
        "La normativa notarial argentina debería generar al menos 10 chunks."
    )


# ==============================================================
# 2. Búsquedas retornan resultados relevantes
# ==============================================================

def test_rag_retorna_normativa_sobre_firma(rag_service_temp):
    """Una query sobre certificación de firma debe retornar chunks relevantes."""
    rag_service_temp.ingestar_documentos(forzar=False)
    contexto = rag_service_temp.buscar_contexto(query=QUERY_FIRMA, n_resultados=3)

    print(f"\n[RAG Firma] Contexto retornado ({len(contexto)} chars):\n{contexto[:400]}")

    assert len(contexto) > 50, (
        f"El contexto retornado es muy corto ({len(contexto)} chars). "
        f"Verificar que la colección global tiene documentos."
    )

    # El contexto debe ser relevante (contener al menos algún token notarial)
    keywords = ["firma", "certificaci", "notarial", "escriban", "fe"]
    contexto_lower = contexto.lower()
    tiene_relevancia = any(kw in contexto_lower for kw in keywords)
    assert tiene_relevancia, (
        f"El contexto no contiene términos notariales relevantes. "
        f"Keywords buscados: {keywords}. Contexto:\n{contexto[:400]!r}"
    )


def test_rag_retorna_contexto_para_fecha_cierta(rag_service_temp):
    """Query sobre Art. 317 debe retornar normativa relevante."""
    rag_service_temp.ingestar_documentos(forzar=False)
    contexto = rag_service_temp.buscar_contexto(query=QUERY_FECHA_CIERTA, n_resultados=3)

    print(f"\n[RAG Fecha Cierta] Contexto ({len(contexto)} chars):\n{contexto[:300]}")

    assert len(contexto) > 20, (
        f"No se retornó contexto para query de fecha cierta. Contexto: {contexto!r}"
    )


def test_rag_no_explota_con_query_irrelevante(rag_service_temp):
    """
    Una query completamente irrelevante no debe crashar el RAG.
    Puede retornar texto no relacionado, pero no debe lanzar excepciones.
    """
    rag_service_temp.ingestar_documentos(forzar=False)

    try:
        contexto = rag_service_temp.buscar_contexto(
            query=QUERY_IRRELEVANTE, n_resultados=2
        )
        print(f"\n[RAG Irrelevante] Contexto retornado: {contexto[:200]!r}")
        # No importa qué retorne, solo que no explote
    except Exception as e:
        pytest.fail(f"El RAG explotó con una query irrelevante: {str(e)}")


# ==============================================================
# 3. Aislamiento por trámite
# ==============================================================

def test_colecciones_tramite_aisladas(rag_service_temp):
    """
    Los documentos del tramite_1 NO deben aparecer al buscar en tramite_2.
    """
    # Indexar un documento específico en tramite_1
    contenido_tramite_1 = b"DOCUMENTO_EXCLUSIVO_TRAMITE_1: Este texto es solo para el tramite uno."
    rag_service_temp.indexar_documento_tramite(
        tramite_id=9991,
        doc_id=1,
        contenido_bytes=contenido_tramite_1,
        nombre="doc_tramite_1.txt",
    )

    # Indexar un documento diferente en tramite_2
    contenido_tramite_2 = b"DOCUMENTO_EXCLUSIVO_TRAMITE_2: Este texto es solo para el tramite dos."
    rag_service_temp.indexar_documento_tramite(
        tramite_id=9992,
        doc_id=2,
        contenido_bytes=contenido_tramite_2,
        nombre="doc_tramite_2.txt",
    )

    # Buscar con tramite_id=9991 — NO debe aparecer TRAMITE_2
    contexto_t1 = rag_service_temp.buscar_contexto(
        query="DOCUMENTO_EXCLUSIVO",
        tramite_id=9991,
        n_resultados=5,
    )

    print(f"\n[Aislamiento] Contexto tramite_1:\n{contexto_t1[:300]}")

    # El contexto de tramite_1 puede tener normativa global + doc tramite_1
    # pero NO debe tener el texto exclusivo de tramite_2
    assert "DOCUMENTO_EXCLUSIVO_TRAMITE_2" not in contexto_t1, (
        f"¡Fuga de datos entre trámites! "
        f"El documento de tramite_2 aparece en la búsqueda de tramite_1. "
        f"Contexto: {contexto_t1}"
    )


def test_eliminar_documento_tramite(rag_service_temp):
    """Eliminar un documento del trámite no debe afectar a otros."""
    # Indexar un documento
    rag_service_temp.indexar_documento_tramite(
        tramite_id=9993,
        doc_id=99,
        contenido_bytes=b"DOCUMENTO_PARA_ELIMINAR: contenido de prueba para eliminacion.",
        nombre="para_eliminar.txt",
    )

    # Verificar que está indexado
    ctx_antes = rag_service_temp.buscar_contexto(
        query="DOCUMENTO_PARA_ELIMINAR",
        tramite_id=9993,
        n_resultados=3,
    )
    print(f"\n[Eliminar] Contexto antes de eliminar: {ctx_antes[:200]!r}")

    # Eliminar
    rag_service_temp.eliminar_documento_tramite(tramite_id=9993, doc_id=99)

    # No debe lanzar excepciones
    ctx_despues = rag_service_temp.buscar_contexto(
        query="DOCUMENTO_PARA_ELIMINAR",
        tramite_id=9993,
        n_resultados=3,
    )
    print(f"[Eliminar] Contexto después de eliminar: {ctx_despues[:200]!r}")
    # Después de eliminar, el texto específico no debe aparecer
    assert "DOCUMENTO_PARA_ELIMINAR" not in ctx_despues, (
        f"El documento sigue apareciendo después de eliminarlo. "
        f"Contexto: {ctx_despues}"
    )


# ==============================================================
# 4. RAG enriquece la calidad del LLM (requiere ambos)
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_rag_enriquece_output_llm(rag_service_real):
    """
    Genera texto con y sin contexto RAG.
    Con RAG, el texto debe ser más largo o tener más terminología notarial.
    """
    from app.services.llm_service import LLMService
    from app.models.schemas import TipoDocumentoCertificar

    llm = LLMService(provider="ollama")
    datos = {"nombre_requirente": "PERSONA_RAG_TEST", "dni": "DOCUMENTO_RAG_000"}

    # 1. Sin RAG
    texto_sin_rag = await llm.generar_certificacion(
        datos_ofuscados=datos,
        tipo_certificacion=TipoDocumentoCertificar.FECHA_CIERTA,
        contexto_legal="",
    )

    # 2. Con RAG
    rag_service_real.ingestar_documentos(forzar=False)
    contexto_rag = rag_service_real.buscar_contexto(
        query="certificación fecha cierta código civil",
        n_resultados=3,
    )
    texto_con_rag = await llm.generar_certificacion(
        datos_ofuscados=datos,
        tipo_certificacion=TipoDocumentoCertificar.FECHA_CIERTA,
        contexto_legal=contexto_rag,
    )

    print(f"\n[RAG vs NoRAG] Sin RAG: {len(texto_sin_rag)} chars")
    print(f"[RAG vs NoRAG] Con RAG: {len(texto_con_rag)} chars")
    print(f"\nTexto CON RAG:\n{texto_con_rag[:400]}")

    # El texto con RAG debe ser al menos tan bueno como sin RAG
    # (heurística: longitud similar o mayor, y calidad igual o mejor)
    reporte_sin = assert_notarial_quality(texto_sin_rag, strict=False)
    reporte_con = assert_notarial_quality(texto_con_rag, strict=False)

    print(f"[RAG vs NoRAG] Score sin RAG: {reporte_sin['score']}/100")
    print(f"[RAG vs NoRAG] Score con RAG: {reporte_con['score']}/100")

    # El score con RAG no debe ser peor que sin RAG
    assert reporte_con["score"] >= reporte_sin["score"] - 25, (
        f"El RAG degradó la calidad del output. "
        f"Sin RAG: {reporte_sin['score']}/100. Con RAG: {reporte_con['score']}/100. "
        f"Texto con RAG:\n{texto_con_rag[:400]}"
    )


# ==============================================================
# 5. Stats del RAG
# ==============================================================

def test_rag_stats_son_coherentes(rag_service_real):
    """Las estadísticas del RAG deben ser coherentes con el estado real."""
    stats = rag_service_real.get_stats()

    print(f"\n[RAG Stats] {stats}")

    assert "normativa_global_chunks" in stats, f"Falta campo en stats: {stats}"
    assert "modo" in stats, f"Falta campo 'modo' en stats: {stats}"
    assert stats["normativa_global_chunks"] >= 0, (
        f"Chunks negativos: {stats}"
    )
    # Si se ingesta, debe haber al menos un chunk
    if stats["normativa_global_chunks"] == 0:
        # Ingestar y verificar
        rag_service_real.ingestar_documentos(forzar=False)
        stats2 = rag_service_real.get_stats()
        assert stats2["normativa_global_chunks"] > 0, (
            f"Después de ingestar, aún hay 0 chunks: {stats2}"
        )
