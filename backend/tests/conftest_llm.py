"""
conftest_llm.py — Fixtures y helpers compartidos para el test suite LLM.

Características:
- Skip automático si Ollama no está disponible (no falla CI).
- Helper `time_async` para medir latencia de corutinas.
- Helper `assert_notarial_quality` para validar calidad documental.
- Fixtures de LLMService (ollama y mock).
"""

import asyncio
import time
import re
from typing import Tuple, Any, Coroutine

import httpx
import pytest
import pytest_asyncio

from app.core.config import get_settings

# ==============================================================
# Constantes de thresholds (ajustar según hardware)
# ==============================================================
THRESHOLD_TTFT_MS = 5000        # 5 segundos máx para first token
THRESHOLD_TOTAL_MS = 60_000     # 60 segundos máx para respuesta completa
THRESHOLD_MIN_CHARS_SEC = 3     # caracteres por segundo mínimo

# Cláusulas que un acta notarial argentina DEBE contener
CLAUSULAS_OBLIGATORIAS = ["DOY FE", "CERTIFICO"]
TERMINOLOGIA_NOTARIAL = [
    "requirente", "comparece", "escribano", "notarial",
    "acto", "instrumento", "fe pública"
]
COLOQUIALISMOS_PROHIBIDOS = [
    "ok", "claro que sí", "genial", "perfecto!", "¡perfecto",
    "desde luego", "por supuesto!", "¡claro", "entendido!"
]


# ==============================================================
# Guard: detectar si Ollama está disponible
# ==============================================================

def is_ollama_available() -> bool:
    """Verifica si Ollama está corriendo en la URL configurada."""
    settings = get_settings()
    try:
        resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3.0)
        return resp.status_code == 200
    except Exception:
        return False


def is_model_available(model_name: str) -> bool:
    """Verifica si un modelo específico está disponible en Ollama."""
    settings = get_settings()
    try:
        resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3.0)
        if resp.status_code != 200:
            return False
        models = resp.json().get("models", [])
        names = [m.get("name", "") for m in models]
        # Verificar si el modelo o alguna variante está disponible
        return any(model_name in n for n in names)
    except Exception:
        return False


# Markers de skip reutilizables
skip_if_no_ollama = pytest.mark.skipif(
    not is_ollama_available(),
    reason="Ollama no está corriendo en localhost:11434. Iniciar con: ollama serve"
)

settings = get_settings()
skip_if_no_llm_model = pytest.mark.skipif(
    not is_ollama_available() or not is_model_available(settings.ollama_llm_model),
    reason=f"Modelo LLM '{settings.ollama_llm_model}' no disponible en Ollama."
)

skip_if_no_embedding_model = pytest.mark.skipif(
    not is_ollama_available() or not is_model_available(settings.ollama_embedding_model),
    reason=f"Modelo de embeddings '{settings.ollama_embedding_model}' no disponible en Ollama."
)


# ==============================================================
# Helpers de Timing
# ==============================================================

async def time_async(coro: Coroutine) -> Tuple[Any, float]:
    """
    Ejecuta una corutina y retorna (resultado, elapsed_ms).
    Uso: resultado, ms = await time_async(llm_svc.chat("hola"))
    """
    start = time.perf_counter()
    result = await coro
    elapsed = (time.perf_counter() - start) * 1000
    return result, elapsed


async def time_stream_first_token(async_gen) -> Tuple[str, float, float]:
    """
    Consume un async generator y retorna (full_text, ttft_ms, total_ms).
    ttft_ms = tiempo hasta el primer chunk no vacío.
    """
    start = time.perf_counter()
    first_token_time = None
    full_content = ""

    async for chunk in async_gen:
        if chunk and first_token_time is None:
            first_token_time = (time.perf_counter() - start) * 1000
        full_content += chunk

    total_ms = (time.perf_counter() - start) * 1000
    ttft = first_token_time or total_ms

    return full_content, ttft, total_ms


# ==============================================================
# Helpers de Calidad Notarial
# ==============================================================

def assert_notarial_quality(texto: str, strict: bool = True) -> dict:
    """
    Evalúa la calidad de un texto notarial argentino.

    Args:
        texto: Texto generado por el LLM.
        strict: Si True, lanza AssertionError en fallos. Si False, retorna reporte.

    Returns:
        Dict con resultados de cada check.
    """
    texto_upper = texto.upper()
    resultados = {}

    # 1. Longitud mínima (un acta notarial real tiene al menos 200 chars)
    resultados["longitud_minima"] = len(texto) >= 200
    if strict:
        assert resultados["longitud_minima"], (
            f"Acta demasiado corta: {len(texto)} chars (mínimo 200). "
            f"Primeros 100 chars: {texto[:100]!r}"
        )

    # 2. Cláusula de cierre obligatoria
    tiene_clausula = any(c in texto_upper for c in CLAUSULAS_OBLIGATORIAS)
    resultados["clausula_cierre"] = tiene_clausula
    if strict:
        assert tiene_clausula, (
            f"Falta cláusula de cierre. Se requiere alguno de: {CLAUSULAS_OBLIGATORIAS}. "
            f"Texto (primeros 500): {texto[:500]!r}"
        )

    # 3. Terminología notarial presente
    terminos_encontrados = [t for t in TERMINOLOGIA_NOTARIAL if t.lower() in texto.lower()]
    resultados["terminologia_presente"] = len(terminos_encontrados) >= 2
    resultados["terminos_encontrados"] = terminos_encontrados
    if strict:
        assert resultados["terminologia_presente"], (
            f"Terminología notarial insuficiente. Encontrados: {terminos_encontrados}. "
            f"Se esperaban al menos 2 de: {TERMINOLOGIA_NOTARIAL}"
        )

    # 4. Sin coloquialismos
    coloquialismos_encontrados = [
        c for c in COLOQUIALISMOS_PROHIBIDOS if c.lower() in texto.lower()
    ]
    resultados["sin_coloquialismos"] = len(coloquialismos_encontrados) == 0
    resultados["coloquialismos_encontrados"] = coloquialismos_encontrados
    if strict:
        assert resultados["sin_coloquialismos"], (
            f"Coloquialismos inaceptables encontrados: {coloquialismos_encontrados}"
        )

    # 5. Score heurístico (0-100)
    checks = [
        resultados["longitud_minima"],
        resultados["clausula_cierre"],
        resultados["terminologia_presente"],
        resultados["sin_coloquialismos"],
    ]
    resultados["score"] = int((sum(checks) / len(checks)) * 100)

    return resultados


def extract_metrics(texto: str, elapsed_ms: float) -> dict:
    """Calcula métricas de rendimiento básicas de una respuesta."""
    words = len(texto.split())
    chars = len(texto)
    seconds = elapsed_ms / 1000

    return {
        "chars": chars,
        "words": words,
        "elapsed_ms": round(elapsed_ms, 1),
        "chars_per_second": round(chars / seconds, 1) if seconds > 0 else 0,
        "words_per_second": round(words / seconds, 1) if seconds > 0 else 0,
    }


# ==============================================================
# Fixtures de Pytest
# ==============================================================

@pytest.fixture(scope="session")
def llm_mock():
    """Fixture: LLMService en modo mock. Siempre disponible."""
    from app.services.llm_service import LLMService
    return LLMService(provider="mock")


@pytest.fixture(scope="session")
def llm_ollama():
    """Fixture: LLMService real con Ollama. Skip si no disponible."""
    if not is_ollama_available():
        pytest.skip("Ollama no disponible")
    from app.services.llm_service import LLMService
    return LLMService(provider="ollama")


@pytest.fixture(scope="session")
def settings_fixture():
    """Fixture: configuración de la app."""
    return get_settings()


@pytest.fixture(scope="session")
def ollama_status():
    """Fixture: estado de Ollama para reportes."""
    available = is_ollama_available()
    s = get_settings()
    llm_ok = is_model_available(s.ollama_llm_model) if available else False
    emb_ok = is_model_available(s.ollama_embedding_model) if available else False
    return {
        "ollama_available": available,
        "llm_model_available": llm_ok,
        "embedding_model_available": emb_ok,
        "llm_model": s.ollama_llm_model,
        "embedding_model": s.ollama_embedding_model,
        "base_url": s.ollama_base_url,
    }
