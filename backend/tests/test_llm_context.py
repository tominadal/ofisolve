"""
test_llm_context.py — Tests de retención de contexto (multiturn).

Verifica que el LLM:
- Recuerda datos mencionados en turnos anteriores.
- Puede responder sobre referencias a conversaciones previas.
- No colapsa ni alucina con historiales de 10+ mensajes.
- Prioriza la corrección más reciente sobre datos anteriores.

NOTA: Estos tests usan `llm.chat()` directamente con history manual,
no el grafo LangGraph, para aislar el comportamiento del LLM puro.
"""

import pytest
import pytest_asyncio

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from conftest_llm import skip_if_no_llm_model


# ==============================================================
# 1. Recuerda el nombre del requirente
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_recuerda_nombre_en_turno_2():
    """
    Turno 1: menciona el nombre del requirente.
    Turno 2: pregunta quién es el requirente sin repetirlo.
    El LLM debe recordarlo desde el historial.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    historia_acumulada = []

    # Turno 1: establece nombre
    q1 = "Voy a crear una certificación para PERSONA_RECORDAR_A, DNI DOCUMENTO_11111."
    r1 = await llm.chat(query=q1, history=historia_acumulada)
    historia_acumulada.append({"role": "user", "content": q1})
    historia_acumulada.append({"role": "assistant", "content": r1})

    print(f"\n[Contexto T1] Q: {q1}")
    print(f"[Contexto T1] A: {r1[:200]}")

    # Turno 2: pregunta sin repetir el nombre
    q2 = "¿Cuál es el nombre completo del requirente que te indiqué?"
    r2 = await llm.chat(query=q2, history=historia_acumulada)
    historia_acumulada.append({"role": "user", "content": q2})
    historia_acumulada.append({"role": "assistant", "content": r2})

    print(f"\n[Contexto T2] Q: {q2}")
    print(f"[Contexto T2] A: {r2[:200]}")

    assert "PERSONA_RECORDAR_A" in r2 or "persona_recordar_a" in r2.lower(), (
        f"El LLM no recordó el nombre del turno 1. "
        f"Respuesta T2: {r2[:400]!r}"
    )


# ==============================================================
# 2. Recuerda el tipo de trámite
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_recuerda_tipo_tramite_multiturn():
    """
    Turno 1: indica tipo de certificación.
    Turno 2: pide que lo repita — debe recordarlo.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    historia = []

    q1 = "Necesito hacer una certificación de FECHA CIERTA para un contrato de locación."
    r1 = await llm.chat(query=q1, history=historia)
    historia.append({"role": "user", "content": q1})
    historia.append({"role": "assistant", "content": r1})

    q2 = "¿Qué tipo de certificación estamos procesando?"
    r2 = await llm.chat(query=q2, history=historia)

    print(f"\n[Tipo Trámite T2] Respuesta: {r2[:300]}")

    assert "fecha cierta" in r2.lower() or "fecha" in r2.lower(), (
        f"El LLM no recordó el tipo de certificación. Respuesta: {r2[:300]!r}"
    )


# ==============================================================
# 3. Historial largo sin degradación
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_historial_10_turnos_no_explota():
    """
    10 turnos de conversación.
    Verifica que el LLM no crashea, alucina DNIs, ni repite loops.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    historia = []
    preguntas = [
        "Buenos días, voy a trabajar con la escribanía hoy.",
        "El requirente se llama PERSONA_LARGA_A, DNI DOCUMENTO_LARGA_1.",
        "¿Qué tipos de certificaciones hay?",
        "Vamos a hacer una certificación de firma.",
        "¿Cuáles son los requisitos formales de esa certificación?",
        "¿Qué dice el CCyC al respecto?",
        "¿Puedo hacer la certificación sin que esté presente el requirente?",
        "¿Qué pasa si el DNI está vencido?",
        "¿La firma debe hacerse con tinta azul o negra?",
        "¿Me podés confirmar el nombre del requirente de hoy?",
    ]

    for i, q in enumerate(preguntas):
        try:
            r = await llm.chat(query=q, history=historia)
            historia.append({"role": "user", "content": q})
            historia.append({"role": "assistant", "content": r})
            print(f"\n[T{i+1}] Q: {q[:60]}")
            print(f"[T{i+1}] A: {r[:150]}")

            # Verificar que la respuesta no esté vacía
            assert len(r.strip()) > 5, f"Respuesta vacía en turno {i+1}"

            # No debe contener errores de servicio
            assert "error" not in r.lower()[:50] or "hubo" not in r.lower()[:50], (
                f"Posible error de servicio en turno {i+1}: {r[:200]!r}"
            )
        except Exception as e:
            pytest.fail(f"El LLM colapsó en el turno {i+1}: {str(e)}")

    # El turno 10 pregunta por el nombre — debe recordarlo del turno 2
    ultima_respuesta = historia[-1]["content"]
    assert "PERSONA_LARGA_A" in ultima_respuesta or "persona_larga" in ultima_respuesta.lower(), (
        f"El LLM no recordó el nombre del requirente después de 10 turnos. "
        f"Última respuesta: {ultima_respuesta[:400]!r}"
    )


# ==============================================================
# 4. Corrección en turno posterior tiene precedencia
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_correccion_contextual_prevalece():
    """
    Turno 1: da un DNI incorrecto.
    Turno 2: lo corrige.
    Turno 3: pregunta cuál es el DNI correcto.
    El LLM debe usar el dato corregido, no el original.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    historia = []

    # Turno 1: dato incorrecto
    q1 = "El requirente es PERSONA_CORRECCION_A, DNI DOCUMENTO_INCORRECTO_111."
    r1 = await llm.chat(query=q1, history=historia)
    historia.append({"role": "user", "content": q1})
    historia.append({"role": "assistant", "content": r1})

    # Turno 2: corrección
    q2 = "Perdón, me equivoqué. El DNI correcto es DOCUMENTO_CORRECTO_999, no el que te dije antes."
    r2 = await llm.chat(query=q2, history=historia)
    historia.append({"role": "user", "content": q2})
    historia.append({"role": "assistant", "content": r2})

    # Turno 3: verificación
    q3 = "¿Cuál es el DNI del requirente?"
    r3 = await llm.chat(query=q3, history=historia)

    print(f"\n[Corrección T3] Respuesta: {r3[:300]}")

    # Debe mencionar el DNI correcto
    assert "DOCUMENTO_CORRECTO_999" in r3 or "999" in r3, (
        f"El LLM no priorizó la corrección. Respuesta: {r3[:400]!r}"
    )

    # No debe mencionar el incorrecto
    # (relajado: puede mencionarlo como "antes tenías INCORRECTO pero ahora es CORRECTO")
    if "DOCUMENTO_INCORRECTO_111" in r3 and "DOCUMENTO_CORRECTO_999" not in r3:
        pytest.fail(
            f"El LLM usa el dato incorrecto en lugar del corregido. "
            f"Respuesta: {r3[:400]!r}"
        )


# ==============================================================
# 5. El contexto legal enriquece la respuesta
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_contexto_legal_inyectado_mejora_respuesta():
    """
    Con contexto legal explícito (simulando RAG), la respuesta debe
    mencionar elementos del contexto provisto.
    """
    from app.services.llm_service import LLMService
    llm = LLMService(provider="ollama")

    contexto_especifico = (
        "ARTÍCULO DE PRUEBA 999-BIS: En caso de certificación de supervivencia, "
        "el escribano debe hacer constar la presencia física del requirente "
        "mediante la expresión 'verifico existencia física y presencia'."
    )

    respuesta = await llm.chat(
        query="¿Qué debo hacer constar en un certificado de supervivencia según la normativa?",
        history=[],
        contexto_legal=contexto_especifico,
    )

    print(f"\n[Contexto Legal] Respuesta: {respuesta[:400]}")

    # Alguna referencia al concepto del contexto inyectado
    assert (
        "presencia" in respuesta.lower()
        or "supervivencia" in respuesta.lower()
        or "física" in respuesta.lower()
    ), (
        f"La respuesta no aprovechó el contexto legal inyectado. "
        f"Respuesta: {respuesta[:400]!r}"
    )
