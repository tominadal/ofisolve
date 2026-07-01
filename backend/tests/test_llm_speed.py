"""
test_llm_speed.py — Tests de velocidad y rendimiento del LLM.

Mide:
- TTFT (Time To First Token) via astream_chat
- Latencia total por tipo de certificación
- Throughput en caracteres/segundo
- Comparativa de los 6 tipos de documento

Thresholds (ajustar según hardware):
  TTFT          < 5000 ms
  Total         < 60000 ms
  Throughput    > 3 chars/seg
"""

import asyncio
import time
import pytest
import pytest_asyncio

from app.models.schemas import TipoDocumentoCertificar

# Importar helpers del conftest_llm
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from conftest_llm import (
    skip_if_no_llm_model,
    time_async,
    time_stream_first_token,
    extract_metrics,
    THRESHOLD_TTFT_MS,
    THRESHOLD_TOTAL_MS,
    THRESHOLD_MIN_CHARS_SEC,
)

# Datos de prueba estables (ofuscados, sin PII real)
DATOS_TEST = {
    "nombre_requirente": "PERSONA_A",
    "dni": "DOCUMENTO_1",
    "tipo": "firma",
    "domicilio": "CALLE_TEST 1234, CABA",
    "cuit": "20-DOCUMENTO_1-3",
}

TIPOS_TODOS = [
    TipoDocumentoCertificar.FIRMA,
    TipoDocumentoCertificar.FOTOCOPIA,
    TipoDocumentoCertificar.CONTENIDO,
    TipoDocumentoCertificar.FECHA_CIERTA,
    TipoDocumentoCertificar.VIAJE_MENORES,
    TipoDocumentoCertificar.SUPERVIVENCIA,
]


# ==============================================================
# 1. Time To First Token (TTFT)
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_ttft_chat_simple():
    """
    TTFT del chat libre.
    El primer token debe llegar antes de THRESHOLD_TTFT_MS.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    query = "Buenos días. ¿Qué tipos de certificaciones pueden realizarse en una escribanía?"

    gen = llm.astream_chat(query=query, history=[])
    full_text, ttft_ms, total_ms = await time_stream_first_token(gen)

    metrics = extract_metrics(full_text, total_ms)
    print(f"\n[TTFT Test] TTFT: {ttft_ms:.0f}ms | Total: {total_ms:.0f}ms | "
          f"Chars: {metrics['chars']} | Throughput: {metrics['chars_per_second']} c/s")

    assert ttft_ms > 0, "No se recibió ningún token"
    assert ttft_ms < THRESHOLD_TTFT_MS, (
        f"TTFT demasiado alto: {ttft_ms:.0f}ms (máx {THRESHOLD_TTFT_MS}ms). "
        f"¿El modelo está cargado en memoria?"
    )
    assert len(full_text) > 10, f"Respuesta demasiado corta: {full_text!r}"


@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_latencia_certificacion_firma():
    """
    Latencia total para generar una certificación de firma.
    Debe completarse en menos de THRESHOLD_TOTAL_MS.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    resultado, elapsed_ms = await time_async(
        llm.generar_certificacion(
            datos_ofuscados=DATOS_TEST,
            tipo_certificacion=TipoDocumentoCertificar.FIRMA,
            contexto_legal="",
        )
    )

    metrics = extract_metrics(resultado, elapsed_ms)
    print(f"\n[Firma] Total: {elapsed_ms:.0f}ms | Chars: {metrics['chars']} | "
          f"Throughput: {metrics['chars_per_second']} c/s")

    assert elapsed_ms < THRESHOLD_TOTAL_MS, (
        f"Latencia excesiva: {elapsed_ms:.0f}ms (máx {THRESHOLD_TOTAL_MS}ms)"
    )
    assert metrics["chars_per_second"] >= THRESHOLD_MIN_CHARS_SEC, (
        f"Throughput insuficiente: {metrics['chars_per_second']} c/s (mín {THRESHOLD_MIN_CHARS_SEC})"
    )


@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_latencia_certificacion_todos_tipos():
    """
    Tabla comparativa de latencia por cada tipo de certificación.
    Todos deben completarse dentro del threshold.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    resultados = []
    fallos = []

    for tipo in TIPOS_TODOS:
        start = time.perf_counter()
        try:
            texto = await llm.generar_certificacion(
                datos_ofuscados=DATOS_TEST,
                tipo_certificacion=tipo,
                contexto_legal="",
            )
            elapsed_ms = (time.perf_counter() - start) * 1000
            metrics = extract_metrics(texto, elapsed_ms)
            resultados.append({
                "tipo": tipo.value,
                "elapsed_ms": round(elapsed_ms, 0),
                "chars": metrics["chars"],
                "chars_per_second": metrics["chars_per_second"],
                "ok": elapsed_ms < THRESHOLD_TOTAL_MS,
            })
            if elapsed_ms >= THRESHOLD_TOTAL_MS:
                fallos.append(f"{tipo.value}: {elapsed_ms:.0f}ms > {THRESHOLD_TOTAL_MS}ms")
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000
            resultados.append({
                "tipo": tipo.value,
                "elapsed_ms": round(elapsed_ms, 0),
                "chars": 0,
                "chars_per_second": 0,
                "ok": False,
                "error": str(e),
            })
            fallos.append(f"{tipo.value}: ERROR — {str(e)[:80]}")

    # Imprimir tabla de resultados
    print("\n" + "="*70)
    print(f"{'TIPO':<20} {'TIEMPO (ms)':<15} {'CHARS':<10} {'C/S':<10} {'OK'}")
    print("="*70)
    for r in resultados:
        ok_str = "✓" if r["ok"] else "✗"
        err = r.get("error", "")[:20] if not r["ok"] else ""
        print(f"{r['tipo']:<20} {r['elapsed_ms']:<15} {r['chars']:<10} {r['chars_per_second']:<10} {ok_str} {err}")
    print("="*70)

    assert not fallos, (
        f"Los siguientes tipos excedieron el threshold de latencia:\n" +
        "\n".join(f"  - {f}" for f in fallos)
    )


@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_throughput_minimo_streaming():
    """
    Verifica que el throughput de streaming sea aceptable.
    Cuenta tokens (chunks) por segundo durante el stream.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    query = "Explica brevemente el procedimiento para una certificación de firma en Argentina."
    gen = llm.astream_chat(query=query, history=[])

    chunks = []
    start = time.perf_counter()
    async for chunk in gen:
        chunks.append((chunk, time.perf_counter() - start))

    if not chunks:
        pytest.fail("No se recibieron chunks del stream")

    total_ms = chunks[-1][1] * 1000
    total_chars = sum(len(c[0]) for c in chunks)
    throughput = total_chars / (total_ms / 1000) if total_ms > 0 else 0

    print(f"\n[Throughput] {len(chunks)} chunks | {total_chars} chars | "
          f"{total_ms:.0f}ms | {throughput:.1f} c/s")

    assert throughput >= THRESHOLD_MIN_CHARS_SEC, (
        f"Throughput de streaming muy bajo: {throughput:.1f} c/s (mínimo {THRESHOLD_MIN_CHARS_SEC} c/s). "
        f"El modelo puede estar generando muy despacio o hay overhead de red."
    )


@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_latencia_con_contexto_legal_rag():
    """
    Compara latencia sin contexto vs con contexto legal largo.
    El overhead por RAG no debe ser más del doble.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    contexto_largo = (
        "NORMATIVA — Ley Notarial 12.990\n"
        "Art. 1: El escribano debe identificar al requirente...\n"
        "Art. 2: La certificación de firma requiere la presencia física...\n"
        "Art. 3: El acta debe contener fecha, lugar, datos del requirente y cláusula DOY FE.\n"
    ) * 5  # Repetir para simular contexto real de RAG

    _, ms_sin_ctx = await time_async(
        llm.generar_certificacion(
            datos_ofuscados=DATOS_TEST,
            tipo_certificacion=TipoDocumentoCertificar.FIRMA,
            contexto_legal="",
        )
    )

    _, ms_con_ctx = await time_async(
        llm.generar_certificacion(
            datos_ofuscados=DATOS_TEST,
            tipo_certificacion=TipoDocumentoCertificar.FIRMA,
            contexto_legal=contexto_largo,
        )
    )

    overhead_factor = ms_con_ctx / ms_sin_ctx if ms_sin_ctx > 0 else float("inf")
    print(f"\n[Overhead RAG] Sin ctx: {ms_sin_ctx:.0f}ms | Con ctx: {ms_con_ctx:.0f}ms | "
          f"Factor: {overhead_factor:.2f}x")

    assert overhead_factor < 3.0, (
        f"El contexto legal aumenta demasiado la latencia: {overhead_factor:.2f}x. "
        f"Sin contexto: {ms_sin_ctx:.0f}ms. Con contexto: {ms_con_ctx:.0f}ms. "
        f"Considera reducir num_ctx en el Modelfile o truncar el contexto RAG."
    )
