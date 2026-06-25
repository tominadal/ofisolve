import pytest
from app.services.llm_service import LLMService

@pytest.mark.asyncio
async def test_llm_validar_documento_mock():
    """Prueba que el validador MOCK devuelva True/False según el texto."""
    llm = LLMService(provider="mock")
    
    # Texto válido (más de 50 caracteres)
    texto_valido = "COMPARECE el requirente en este acto para firmar. ... DOY FE."
    res = await llm.validar_documento(texto_valido)
    assert res["aprobado"] is True
    
    # Texto inválido (muy corto o sin doy fe en mock)
    texto_invalido = "Hola"
    res2 = await llm.validar_documento(texto_invalido)
    assert res2["aprobado"] is False
    assert len(res2["criticas"]) > 0

# En un entorno con Ollama corriendo se puede agregar otra prueba
# @pytest.mark.asyncio
# async def test_llm_validar_documento_ollama(): ...
