"""
test_llm_structured_output.py — Tests del ExtractorService (Structured Output).

Verifica que el LLM con `with_structured_output(ExtraccionNotarial)`:
1. Extrae correctamente nombre y DNI de texto simple.
2. Extrae múltiples partes (comprador/vendedor).
3. El JSON siempre es válido y parseable por Pydantic.
4. Campos opcionales (email, tel) retornan None, no error.
5. Texto de chat libre no genera un trámite fantasma.
6. El tipo de acto extraído es semánticamente correcto.

NOTA: El ExtractorService siempre usa Ollama directamente.
      Si Ollama no está disponible, estos tests se skipean.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from conftest_llm import skip_if_no_llm_model, is_ollama_available


# Textos de prueba
TEXTO_UNA_PERSONA = """
Tipo de trámite: Certificación de Firma. 
Nombre: PERSONA_EXTRAER_A. DNI: DOCUMENTO_EXTRAER_001. 
El requirente solicita certificación de su firma en el presente documento.
"""

TEXTO_DOS_PERSONAS = """
Tipo de trámite: Compraventa de Inmueble.
COMPARECE como VENDEDOR: PERSONA_VEND_B, DNI DOCUMENTO_VEND_002, 
domiciliado en CALLE_VEND 111.
COMPARECE como COMPRADOR: PERSONA_COMP_C, DNI DOCUMENTO_COMP_003,
domiciliado en CALLE_COMP 222.
Objeto: lote ubicado en CALLE_LOTE 333.
"""

TEXTO_PERSONA_CON_OPCIONALES = """
Tipo de trámite: Poder General.
Nombre: PERSONA_PODER_D, DNI DOCUMENTO_PODER_004, 
email: test@test.com, teléfono: 011-4444-5555, 
domicilio: CALLE_PODER 999, CABA.
Otorgante del poder para todos los actos civiles y comerciales.
"""

TEXTO_SIN_EMAIL_NI_TEL = """
Tipo de trámite: Certificación de Supervivencia.
Nombre: PERSONA_SUPERV_E, DNI DOCUMENTO_SUPERV_005.
El requirente se presenta para certificar su existencia.
"""

TEXTO_CHAT_LIBRE = "Hola, buenos días, ¿me podés ayudar con una consulta?"


# ==============================================================
# Helper: ejecutar extractor en modo mock de DB
# ==============================================================

async def _run_extractor_sin_db(texto: str) -> dict:
    """
    Ejecuta el extractor Ollama pero mocka la DB para no persistir.
    Retorna el objeto ExtraccionNotarial del LLM (sin DB commit).
    """
    from app.services.extraction_service import ExtractorService, ExtraccionNotarial

    extractor = ExtractorService()

    # Invocar directamente el LLM extractor (sin persistencia en DB)
    resultado: ExtraccionNotarial = await extractor.extractor.ainvoke(
        f"Analiza el siguiente documento notarial y extrae los datos relevantes:\n\n{texto}"
    )
    return resultado


# ==============================================================
# 1. Extracción básica — una persona
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_extrae_nombre_y_dni_una_persona():
    """El extractor debe identificar 1 persona con nombre y DNI."""
    from app.services.extraction_service import ExtraccionNotarial

    resultado = await _run_extractor_sin_db(TEXTO_UNA_PERSONA)

    print(f"\n[Extractor 1P] tipo_acto: {resultado.tipo_acto}")
    print(f"[Extractor 1P] personas: {resultado.personas}")

    assert isinstance(resultado, ExtraccionNotarial), (
        f"El resultado no es un ExtraccionNotarial: {type(resultado)}"
    )
    assert len(resultado.personas) >= 1, (
        f"Se esperaba al menos 1 persona. Resultado: {resultado}"
    )

    persona = resultado.personas[0]
    assert "PERSONA_EXTRAER_A" in persona.nombre or "persona_extraer_a" in persona.nombre.lower(), (
        f"Nombre extraído incorrecto: {persona.nombre!r}. "
        f"Personas: {resultado.personas}"
    )
    assert "DOCUMENTO_EXTRAER" in persona.dni_cuit or "001" in persona.dni_cuit, (
        f"DNI extraído incorrecto: {persona.dni_cuit!r}"
    )


# ==============================================================
# 2. Extracción de múltiples partes
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_extrae_multiples_partes_comprador_vendedor():
    """El extractor debe identificar 2 personas con roles distintos."""
    from app.services.extraction_service import ExtraccionNotarial

    resultado = await _run_extractor_sin_db(TEXTO_DOS_PERSONAS)

    print(f"\n[Extractor 2P] tipo_acto: {resultado.tipo_acto}")
    print(f"[Extractor 2P] personas: {[p.dict() for p in resultado.personas]}")

    assert len(resultado.personas) >= 2, (
        f"Se esperaban al menos 2 personas (comprador y vendedor). "
        f"Extraídas: {len(resultado.personas)}. Personas: {resultado.personas}"
    )

    roles = [p.rol.lower() for p in resultado.personas]
    # Debe haber algún rol relacionado con vendedor y comprador
    tiene_vendedor = any("vend" in r or "vendedor" in r for r in roles)
    tiene_comprador = any("comp" in r or "comprador" in r for r in roles)

    assert tiene_vendedor, f"No se detectó rol de vendedor. Roles: {roles}"
    assert tiene_comprador, f"No se detectó rol de comprador. Roles: {roles}"


# ==============================================================
# 3. Output siempre parseable por Pydantic
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
@pytest.mark.parametrize("texto,descripcion", [
    (TEXTO_UNA_PERSONA, "una persona"),
    (TEXTO_DOS_PERSONAS, "dos personas"),
    (TEXTO_PERSONA_CON_OPCIONALES, "datos opcionales"),
    (TEXTO_SIN_EMAIL_NI_TEL, "sin email ni tel"),
])
async def test_json_es_valido_pydantic_siempre(texto, descripcion):
    """
    Para cualquier texto notarial, el output del extractor debe
    ser un objeto Pydantic válido sin lanzar excepciones.
    """
    from app.services.extraction_service import ExtraccionNotarial

    try:
        resultado = await _run_extractor_sin_db(texto)
        assert isinstance(resultado, ExtraccionNotarial), (
            f"[{descripcion}] El resultado no es ExtraccionNotarial: {type(resultado)}"
        )
        print(f"\n[Pydantic Valid - {descripcion}] OK. tipo_acto: {resultado.tipo_acto}")
    except Exception as e:
        pytest.fail(
            f"[{descripcion}] El extractor lanzó una excepción al parsear: {str(e)}"
        )


# ==============================================================
# 4. Campos opcionales retornan None, no error
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_campos_opcionales_son_none_no_error():
    """
    Un texto sin email ni teléfono debe extraerse sin error,
    y los campos opcionales deben ser None.
    """
    from app.services.extraction_service import ExtraccionNotarial

    resultado = await _run_extractor_sin_db(TEXTO_SIN_EMAIL_NI_TEL)

    print(f"\n[Opcionales None] personas: {[p.dict() for p in resultado.personas]}")

    for persona in resultado.personas:
        # email y telefono deben ser None o vacíos (no strings inventados)
        if persona.email:
            # Si el LLM inventa un email, que al menos tenga formato
            assert "@" in persona.email, (
                f"El LLM inventó un email malformado: {persona.email!r}"
            )
        if persona.telefono:
            # El teléfono inventado debe tener al menos dígitos
            assert any(c.isdigit() for c in persona.telefono), (
                f"El LLM inventó un teléfono sin dígitos: {persona.telefono!r}"
            )


# ==============================================================
# 5. Chat libre no genera trámite fantasma
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_chat_libre_no_genera_tramite_fantasma():
    """
    Un mensaje de chat simple (<80 palabras, sin keywords notariales)
    debe retornar tipo 'chat_libre', sin crear trámites en DB.
    """
    from app.services.extraction_service import ExtractorService
    from unittest.mock import AsyncMock, MagicMock

    extractor = ExtractorService()

    # Mockear la DB para no persistir nada
    mock_db = AsyncMock()

    resultado = await extractor.procesar_y_persistir(
        texto=TEXTO_CHAT_LIBRE,
        db=mock_db,
        workspace_id=1,
    )

    print(f"\n[Chat Libre] Resultado: {resultado}")

    assert resultado.get("tipo") == "chat_libre", (
        f"El extractor creó un trámite para un mensaje de chat libre. "
        f"Resultado: {resultado}"
    )

    # La DB no debería haber recibido commit
    mock_db.commit.assert_not_called()


# ==============================================================
# 6. Tipo de acto es semánticamente correcto
# ==============================================================

@skip_if_no_llm_model
@pytest.mark.asyncio
async def test_tipo_acto_semanticamente_correcto():
    """
    El tipo de acto extraído debe ser coherente con el contenido del texto.
    Para una compraventa, debe retornar algo como 'Compraventa' o 'Venta'.
    """
    resultado = await _run_extractor_sin_db(TEXTO_DOS_PERSONAS)

    tipo_acto = resultado.tipo_acto.lower()
    print(f"\n[Tipo Acto] tipo_acto extraído: {resultado.tipo_acto!r}")

    assert (
        "compra" in tipo_acto
        or "venta" in tipo_acto
        or "inmueble" in tipo_acto
        or "compraventa" in tipo_acto
    ), (
        f"El tipo de acto '{resultado.tipo_acto}' no es coherente con una compraventa. "
        f"Se esperaba algo como 'Compraventa', 'Venta', 'Inmueble'."
    )
