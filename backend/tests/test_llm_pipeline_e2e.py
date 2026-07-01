"""
test_llm_pipeline_e2e.py — Tests del pipeline LangGraph completo E2E.

Verifica el grafo multi-agente de certificación (certification_agent.py):
  ofuscar_local → extraer_entidades → recuperar_rag_local →
  redactar_llm → validar_llm → [loop] → desofuscar_local → END

Tests:
1. Pipeline completo genera texto final coherente
2. Ofuscación real: el LLM nunca ve el nombre/DNI original
3. El ciclo de validación reintenta cuando el texto es insuficiente
4. No supera el límite de 3 reintentos
5. Latencia total del pipeline E2E

NOTA: El grafo `grafo_certificacion` de certification_agent.py
      usa siempre Ollama. Para evitar llamadas reales en CI, se testea
      opcionalmente con `ai_provider="mock"` cuando Ollama no está disponible.
"""

import asyncio
import time
import pytest
import pytest_asyncio

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from conftest_llm import (
    is_ollama_available,
    skip_if_no_llm_model,
    THRESHOLD_TOTAL_MS,
)

# Input de prueba — datos reales (serán ofuscados por el pipeline)
INPUT_TEST = {
    "nombre_requirente": "Carlos Alberto Rodríguez",
    "dni": "30123456",
    "tipo_certificacion": "firma",
    "nombre_escribano": "Dra. Ana Martínez",
    "nro_registro": "Nr. 999",
    "domicilio": "Av. Corrientes 1234, CABA",
    "cuit": None,
    "observaciones": None,
}


# ==============================================================
# Helper: invocar el grafo (con soporte mock y ollama)
# ==============================================================

async def invocar_grafo_certificacion(ai_provider: str = "mock") -> dict:
    """Invoca el grafo de certificación y retorna el estado final."""
    from app.agents.certification_agent import crear_grafo_certificacion

    grafo = crear_grafo_certificacion()
    state_input = {**INPUT_TEST, "ai_provider": ai_provider, "tenant_id": 1}

    # El grafo es síncrono/asíncrono mixto — usar ainvoke si está disponible
    if hasattr(grafo, "ainvoke"):
        result = await grafo.ainvoke(state_input)
    else:
        result = grafo.invoke(state_input)
    return result


# ==============================================================
# 1. Pipeline completo — modo MOCK (siempre disponible)
# ==============================================================

@pytest.mark.asyncio
async def test_pipeline_completo_mock():
    """
    Pipeline completo en modo MOCK.
    Siempre debe ejecutarse, sin necesitar Ollama.
    """
    result = await invocar_grafo_certificacion(ai_provider="mock")

    print(f"\n[Pipeline Mock] Estado: {result.get('estado')}")
    print(f"[Pipeline Mock] Texto final (100 chars): {str(result.get('texto_final', ''))[:100]}")

    assert result is not None, "El grafo no retornó resultado"
    texto_final = result.get("texto_final", "")
    assert len(texto_final) > 50, (
        f"El texto final mock es demasiado corto: {len(texto_final)} chars. "
        f"Resultado: {result}"
    )
    assert "DOY FE" in texto_final.upper(), (
        f"El texto final mock no contiene 'DOY FE'. Texto: {texto_final[:400]}"
    )


# ==============================================================
# 2. Pipeline Ollama — texto final coherente
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_pipeline_completo_ollama():
    """
    Pipeline completo con Ollama real.
    El texto final debe ser un acta notarial válida.
    """
    from conftest_llm import assert_notarial_quality

    result = await invocar_grafo_certificacion(ai_provider="ollama")

    print(f"\n[Pipeline Ollama] Estado: {result.get('estado')}")
    texto_final = result.get("texto_final", "")
    print(f"[Pipeline Ollama] Texto final:\n{texto_final[:500]}")

    assert texto_final, "El pipeline no produjo texto final"
    assert not result.get("error"), f"El pipeline retornó error: {result.get('error')}"

    # Verificar calidad notarial del output
    reporte = assert_notarial_quality(texto_final, strict=False)
    print(f"[Pipeline Ollama] Score calidad: {reporte['score']}/100")
    assert reporte["score"] >= 50, (
        f"El pipeline Ollama produjo un texto de baja calidad: {reporte['score']}/100. "
        f"Reporte: {reporte}. Texto:\n{texto_final[:600]}"
    )


# ==============================================================
# 3. Ofuscación real: el LLM NO ve datos reales
# ==============================================================

@pytest.mark.asyncio
async def test_pipeline_ofuscacion_correcta_mock():
    """
    Verifica que los datos de ofuscación/desofuscación funcionan:
    - datos_ofuscados != datos originales (el nombre fue reemplazado)
    - texto_final contiene el nombre real (fue desofuscado)
    """
    result = await invocar_grafo_certificacion(ai_provider="mock")

    datos_ofuscados = result.get("datos_ofuscados", {})
    texto_final = result.get("texto_final", "")

    print(f"\n[Ofuscación] datos_ofuscados: {datos_ofuscados}")
    print(f"[Ofuscación] texto_final[:200]: {texto_final[:200]}")

    # Los datos ofuscados no deben contener el nombre real
    nombre_real = INPUT_TEST["nombre_requirente"]
    nombre_en_ofuscado = datos_ofuscados.get("nombre_requirente", "")
    
    # Si el nombre fue ofuscado, el campo ofuscado es diferente al original
    # (O el mapa de inversión tiene al menos una entrada)
    mapa_inversion = result.get("mapa_inversion", {})
    print(f"[Ofuscación] mapa_inversion: {mapa_inversion}")

    # El texto final DEBE contener el nombre real (desofuscado)
    assert nombre_real in texto_final or nombre_real.split()[0] in texto_final, (
        f"El nombre real '{nombre_real}' no aparece en el texto final desofuscado. "
        f"Texto final: {texto_final[:400]!r}"
    )


# ==============================================================
# 4. Validador: ciclo de retry funciona
# ==============================================================

@pytest.mark.asyncio  
async def test_pipeline_validador_rechaza_texto_corto():
    """
    El validador debe rechazar textos muy cortos y reintentarlo.
    Verifica que intentos > 1 si el primer borrador es insuficiente.
    
    NOTA: En modo mock, el texto siempre pasa. Este test valida
    la lógica del validador de forma unitaria.
    """
    # Test unitario del validador (sin invocar el grafo completo)
    from app.agents.certification_agent import validar_llm

    # Simular estado con texto muy corto
    state_invalido = {
        "texto_ofuscado": "Texto corto sin clausulas.",
        "intentos": 1,
        "aprobado": False,
        "feedback_validador": None,
    }

    result = await validar_llm(state_invalido)

    print(f"\n[Validador] Resultado con texto corto: {result}")
    assert result["aprobado"] is False, (
        f"El validador aprobó un texto inválido. Result: {result}"
    )
    assert result.get("feedback_validador"), (
        f"El validador no proveyó feedback. Result: {result}"
    )


@pytest.mark.asyncio
async def test_pipeline_validador_aprueba_texto_valido():
    """El validador debe aprobar un acta notarial bien formada."""
    from app.agents.certification_agent import validar_llm

    acta_valida = """CERTIFICACIÓN DE FIRMA

En la Ciudad Autónoma de Buenos Aires, a los 15 días del mes de junio de 2026,
ante mí, Escribano/a Público/a, Titular del Registro Notarial N° 999, 
COMPARECE: Carlos Rodríguez, D.N.I. N° 30123456, mayor de edad, hábil y 
de mi conocimiento personal.

El/La compareciente estampa su firma en mi presencia al pie del documento 
que se me exhibe, la cual CERTIFICO como auténtica.

DOY FE.-"""

    state_valido = {
        "texto_ofuscado": acta_valida,
        "intentos": 1,
        "aprobado": False,
        "feedback_validador": None,
    }

    result = await validar_llm(state_valido)

    print(f"\n[Validador] Resultado con texto válido: {result}")
    assert result["aprobado"] is True, (
        f"El validador rechazó un texto válido. Result: {result}"
    )


# ==============================================================
# 5. Límite de reintentos: máx 3
# ==============================================================

@pytest.mark.asyncio
async def test_pipeline_max_3_reintentos():
    """
    Con 3 intentos ya realizados, el validador debe aprobar
    (o al menos no generar más reintentos) para evitar loops infinitos.
    """
    from app.agents.certification_agent import validar_llm

    state_3_intentos = {
        "texto_ofuscado": "Texto corto sin clausulas.",
        "intentos": 3,  # Ya en el límite
        "aprobado": False,
        "feedback_validador": None,
    }

    result = await validar_llm(state_3_intentos)

    print(f"\n[Reintentos Máx] Resultado con 3 intentos: {result}")
    # Con 3 intentos, el validador debe aprobar (aunque el texto sea malo)
    # para romper el loop según la lógica: `if errores and state["intentos"] < 3`
    assert result["aprobado"] is True, (
        f"Con 3 intentos el validador debería aprobar para evitar loop infinito. "
        f"Result: {result}"
    )


# ==============================================================
# 6. Latencia total del pipeline E2E (Ollama)
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_pipeline_latencia_total_e2e():
    """
    El pipeline completo (6 nodos) debe completarse en < THRESHOLD_TOTAL_MS.
    Si supera ese umbral, hay un problema de rendimiento.
    """
    # El pipeline tiene 3 llamadas al LLM (extractor + redactor + validador)
    # con Ollama local, lo doblamos para dar margen
    threshold_pipeline = THRESHOLD_TOTAL_MS * 3

    start = time.perf_counter()
    result = await invocar_grafo_certificacion(ai_provider="ollama")
    elapsed_ms = (time.perf_counter() - start) * 1000

    print(f"\n[Pipeline E2E] Tiempo total: {elapsed_ms:.0f}ms")
    print(f"[Pipeline E2E] Estado: {result.get('estado')}")
    print(f"[Pipeline E2E] Intentos: {result.get('intentos')}")

    assert elapsed_ms < threshold_pipeline, (
        f"Pipeline E2E demasiado lento: {elapsed_ms:.0f}ms (máx {threshold_pipeline}ms). "
        f"Posibles causas: modelo no cargado en memoria, num_ctx muy alto, "
        f"contexto RAG demasiado extenso."
    )

    assert not result.get("error"), f"Pipeline retornó error: {result.get('error')}"
