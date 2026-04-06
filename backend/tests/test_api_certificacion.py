"""
Tests para el endpoint de certificación.

Ejecutar con: python -m pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    """Fixture con cliente de test de FastAPI."""
    return TestClient(app)


class TestEndpointCertificacion:
    """Tests de integración para POST /api/v1/generate/certificacion."""

    def test_certificacion_fotocopia_exitosa(self, client: TestClient):
        """Verifica el flujo completo de certificación de fotocopia."""
        payload = {
            "nombre_requirente": "Juan Carlos Pérez",
            "dni": "35123456",
            "tipo_documento_a_certificar": "fotocopia",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)

        assert response.status_code == 200
        data = response.json()

        # El texto generado debe existir y no estar vacío
        assert "texto_generado" in data
        assert len(data["texto_generado"]) > 0

        # Siempre requiere revisión (Human in the Loop)
        assert data["requiere_revision"] is True

        # Estado inicial debe ser borrador
        assert data["estado"] == "borrador"

        # Debe incluir info de anonimización
        assert "anonimizacion" in data

    def test_certificacion_firma(self, client: TestClient):
        """Verifica generación de certificación de firma."""
        payload = {
            "nombre_requirente": "María García",
            "dni": "28456789",
            "tipo_documento_a_certificar": "firma",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)
        assert response.status_code == 200

    def test_validacion_dni_invalido(self, client: TestClient):
        """Verifica que un DNI con formato inválido sea rechazado."""
        payload = {
            "nombre_requirente": "Test User",
            "dni": "123",  # Muy corto
            "tipo_documento_a_certificar": "fotocopia",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)
        assert response.status_code == 422

    def test_validacion_tipo_documento_invalido(self, client: TestClient):
        """Verifica que un tipo de documento inexistente sea rechazado."""
        payload = {
            "nombre_requirente": "Test User",
            "dni": "35123456",
            "tipo_documento_a_certificar": "tipo_inexistente",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)
        assert response.status_code == 422

    def test_validacion_nombre_vacio(self, client: TestClient):
        """Verifica que un nombre vacío sea rechazado."""
        payload = {
            "nombre_requirente": "",
            "dni": "35123456",
            "tipo_documento_a_certificar": "fotocopia",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)
        assert response.status_code == 422

    def test_campos_opcionales(self, client: TestClient):
        """Verifica que los campos opcionales se manejen correctamente."""
        payload = {
            "nombre_requirente": "Roberto Gómez",
            "dni": "40987654",
            "tipo_documento_a_certificar": "contenido",
            "domicilio": "Av. Corrientes 1234, CABA",
            "cuit": "20-40987654-3",
            "observaciones": "Documento en idioma inglés",
        }

        response = client.post("/api/v1/generate/certificacion", json=payload)
        assert response.status_code == 200


class TestHealthEndpoints:
    """Tests para endpoints de salud del sistema."""

    def test_root(self, client: TestClient):
        """Verifica el endpoint raíz."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["sistema"] == "OfiSolve"

    def test_health(self, client: TestClient):
        """Verifica el health check global."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_generation_health(self, client: TestClient):
        """Verifica el health check del servicio de generación."""
        response = client.get("/api/v1/generate/health")
        assert response.status_code == 200
