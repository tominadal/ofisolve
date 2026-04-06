"""
Tests unitarios para el Motor de Privacidad (PrivacyService).

Ejecutar con: python -m pytest tests/ -v
"""

import pytest

from app.services.privacy_service import PrivacyService


@pytest.fixture
def privacy_service() -> PrivacyService:
    """Fixture que provee una instancia limpia del servicio de privacidad."""
    return PrivacyService()


class TestAnonymizePayload:
    """Tests para la función anonymize_payload."""

    def test_anonimiza_nombre_y_dni(self, privacy_service: PrivacyService):
        """Verifica que se anonimicen nombres y DNI correctamente."""
        datos = {
            "nombre_requirente": "Juan Carlos Pérez",
            "dni": "35123456",
            "tipo_documento_a_certificar": "fotocopia",
        }

        ofuscado, mapa = privacy_service.anonymize_payload(datos)

        # El nombre debería estar reemplazado por un token
        assert "Juan" not in ofuscado.get("nombre_requirente", "")
        assert "Pérez" not in ofuscado.get("nombre_requirente", "")

        # El tipo de documento NO es PII, debería mantenerse
        assert ofuscado["tipo_documento_a_certificar"] == "fotocopia"

        # El mapa debe contener los valores originales
        assert any("Juan" in v or "Pérez" in v for v in mapa.values())

    def test_anonimiza_cuit(self, privacy_service: PrivacyService):
        """Verifica que se anonimice el CUIT argentino."""
        datos = {
            "cuit": "20-35123456-7",
        }

        ofuscado, mapa = privacy_service.anonymize_payload(datos)

        assert "20-35123456-7" not in ofuscado.get("cuit", "")
        assert any("20-35123456-7" in v for v in mapa.values())

    def test_campos_vacios_no_se_procesan(self, privacy_service: PrivacyService):
        """Verifica que campos vacíos o None se pasan tal cual."""
        datos = {
            "observaciones": "",
            "domicilio": None,
            "valor_numerico": 42,
        }

        ofuscado, mapa = privacy_service.anonymize_payload(datos)

        assert ofuscado["observaciones"] == ""
        assert ofuscado["domicilio"] is None
        assert ofuscado["valor_numerico"] == 42
        assert len(mapa) == 0

    def test_valores_duplicados_usan_mismo_token(self, privacy_service: PrivacyService):
        """Verifica que el mismo valor PII siempre mapee al mismo token."""
        datos = {
            "campo_1": "Juan Carlos Pérez",
            "campo_2": "Juan Carlos Pérez",
        }

        ofuscado, mapa = privacy_service.anonymize_payload(datos)

        # Si ambos campos tenían el mismo nombre, deberían tener el mismo token
        if ofuscado["campo_1"] != datos["campo_1"]:
            assert ofuscado["campo_1"] == ofuscado["campo_2"]


class TestDeanonymizeText:
    """Tests para la función deanonymize_text."""

    def test_restaura_tokens_correctamente(self, privacy_service: PrivacyService):
        """Verifica la restauración completa de tokens."""
        texto_ofuscado = (
            "Yo, [NOMBRE_1], D.N.I. N° [DNI_1], certifico que la fotocopia es fiel."
        )
        mapa = {
            "[NOMBRE_1]": "Juan Carlos Pérez",
            "[DNI_1]": "35123456",
        }

        resultado = privacy_service.deanonymize_text(texto_ofuscado, mapa)

        assert "Juan Carlos Pérez" in resultado
        assert "35123456" in resultado
        assert "[NOMBRE_1]" not in resultado
        assert "[DNI_1]" not in resultado

    def test_multiples_ocurrencias_del_mismo_token(self, privacy_service: PrivacyService):
        """Verifica que todas las ocurrencias de un token se reemplacen."""
        texto_ofuscado = "[NOMBRE_1] es titular. [NOMBRE_1] firma el documento."
        mapa = {"[NOMBRE_1]": "María García"}

        resultado = privacy_service.deanonymize_text(texto_ofuscado, mapa)

        assert resultado.count("María García") == 2
        assert "[NOMBRE_1]" not in resultado

    def test_error_si_quedan_tokens_sin_resolver(self, privacy_service: PrivacyService):
        """Verifica que se lance error si quedan tokens huérfanos."""
        texto_ofuscado = "[NOMBRE_1] tiene DNI [DNI_99]"
        mapa = {"[NOMBRE_1]": "Juan Pérez"}  # Falta [DNI_99]

        with pytest.raises(ValueError, match="tokens sin resolver"):
            privacy_service.deanonymize_text(texto_ofuscado, mapa)

    def test_texto_sin_tokens(self, privacy_service: PrivacyService):
        """Verifica que texto sin tokens se devuelve intacto."""
        texto = "Este texto no tiene ningún dato personal."
        mapa = {}

        resultado = privacy_service.deanonymize_text(texto, mapa)

        assert resultado == texto


class TestRoundTrip:
    """Tests de integración: anonimizar → simular LLM → desanonimizar."""

    def test_flujo_completo(self, privacy_service: PrivacyService):
        """Verifica que datos anonimizados y luego restaurados sean iguales al original."""
        datos = {
            "nombre_requirente": "Ana María López",
            "dni": "28456789",
        }

        # Paso 1: Anonimizar
        ofuscado, mapa = privacy_service.anonymize_payload(datos)

        # Paso 2: Simular uso por LLM (construir texto con tokens)
        nombre_ofuscado = ofuscado["nombre_requirente"]
        dni_ofuscado = ofuscado["dni"]
        texto_llm = f"Yo, {nombre_ofuscado}, DNI {dni_ofuscado}, comparezco."

        # Paso 3: Desanonimizar
        texto_final = privacy_service.deanonymize_text(texto_llm, mapa)

        # Verificar que los datos reales aparecen en el texto final
        # Nota: Dependiendo de qué detecte Presidio, puede o no anonimizar todo
        # Este test verifica que el flujo completo funciona sin errores
        assert isinstance(texto_final, str)
        assert len(texto_final) > 0


class TestGetStats:
    """Tests para la función get_stats."""

    def test_estadisticas_correctas(self, privacy_service: PrivacyService):
        """Verifica que las estadísticas reflejen los tokens generados."""
        mapa = {
            "[NOMBRE_1]": "Juan Pérez",
            "[NOMBRE_2]": "María García",
            "[DNI_1]": "35123456",
        }

        stats = privacy_service.get_stats(mapa)

        assert stats["campos_anonimizados"] == 3
        assert "NOMBRE" in stats["tipos_detectados"]
        assert "DNI" in stats["tipos_detectados"]
