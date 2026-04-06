"""Test E2E para el flujo LangGraph + RAG + ChromaDB."""
import httpx
import json

BASE_URL = "http://localhost:8000"

# ========================================
# Test 1: Health Check (nuevo formato)
# ========================================
print("=== TEST 1: Health Check ===")
r = httpx.get(f"{BASE_URL}/api/v1/generate/health", timeout=30)
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))

# ========================================
# Test 2: Ingestar RAG manualmente
# ========================================
print()
print("=== TEST 2: Ingestar RAG ===")
r2 = httpx.post(f"{BASE_URL}/api/v1/generate/rag/ingestar", timeout=60)
print(f"Status: {r2.status_code}")
print(json.dumps(r2.json(), indent=2))

# ========================================
# Test 3: RAG Stats
# ========================================
print()
print("=== TEST 3: RAG Stats ===")
r3 = httpx.get(f"{BASE_URL}/api/v1/generate/rag/stats", timeout=10)
print(f"Status: {r3.status_code}")
print(json.dumps(r3.json(), indent=2))

# ========================================
# Test 4: Certificación E2E vía LangGraph
# ========================================
print()
print("=== TEST 4: Certificacion E2E (LangGraph) ===")
r4 = httpx.post(
    f"{BASE_URL}/api/v1/generate/certificacion",
    json={
        "nombre_requirente": "Juan Carlos Perez",
        "dni": "35123456",
        "tipo_documento_a_certificar": "fotocopia",
    },
    params={
        "nombre_escribano": "Dra. Maria Gonzalez",
        "nro_registro": "42",
    },
    timeout=120,
)
print(f"Status: {r4.status_code}")
if r4.status_code == 200:
    data = r4.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
else:
    print(r4.text)

# ========================================
# Test 5: Certificación de firma con campos opcionales
# ========================================
print()
print("=== TEST 5: Certificacion Firma ===")
r5 = httpx.post(
    f"{BASE_URL}/api/v1/generate/certificacion",
    json={
        "nombre_requirente": "Maria Laura Rodriguez",
        "dni": "28456789",
        "tipo_documento_a_certificar": "firma",
        "cuit": "27-28456789-4",
        "domicilio": "Av. Corrientes 1234, CABA",
    },
    timeout=120,
)
print(f"Status: {r5.status_code}")
if r5.status_code == 200:
    data5 = r5.json()
    print(f"Modo LLM: {data5.get('modo_llm')}")
    print(f"Archivo: {data5.get('archivo_docx')}")
    print(f"Campos anonimizados: {data5['anonimizacion']['campos_anonimizados']}")
    print(f"Tipos: {data5['anonimizacion']['tipos_detectados']}")
else:
    print(r5.text)

# ========================================
# Test 6: Descarga archivo
# ========================================
if r4.status_code == 200 and data.get("archivo_docx"):
    print()
    print("=== TEST 6: Descarga .docx ===")
    r6 = httpx.get(
        f"{BASE_URL}/api/v1/generate/descargar/{data['archivo_docx']}",
        timeout=30,
    )
    print(f"Status: {r6.status_code}")
    print(f"Content-Type: {r6.headers.get('content-type')}")
    print(f"Tamano: {len(r6.content)} bytes")

# ========================================
# Test 7: Extraccion de Entidades (NUEVO)
# ========================================
print()
print("=== TEST 7: Extraccion de Entidades y BD ===")
r7 = httpx.post(
    f"{BASE_URL}/api/v1/generate/certificacion",
    json={
        "nombre_requirente": "Tomas Nadal",
        "dni": "35123456",
        "tipo_documento_a_certificar": "firma",
        "domicilio": "Calle Falsa 123, CABA",
    },
    timeout=120,
)
print(f"Status: {r7.status_code}")
if r7.status_code == 200:
    data7 = r7.json()
    extraidos = data7.get("datos_extraidos")
    if extraidos:
        print("✅ Entidades extraidas y guardadas:")
        print(f"   Trámite ID: {extraidos.get('tramite_id')}")
        print(f"   Tipo Acto: {extraidos.get('tipo_acto')}")
        for c in extraidos.get("clientes", []):
            print(f"   - Cliente: {c['nombre']} | DNI: {c['dni_cuit']} | Rol: {c['rol']}")
    else:
        print("❌ No se devolvieron datos extraidos.")
else:
    print(r7.text)

print()
print("=== TESTS COMPLETADOS ===")
