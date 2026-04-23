import json
from datetime import datetime
from app.models.workspace_schemas import TramiteResponse

def test_json():
    data = {
        "id": 1,
        "workspace_id": 1,
        "nombre": "Test",
        "tipo": "tipo",
        "estado": "abierto",
        "cliente_id": 123,
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    # Try to create a response object
    resp = TramiteResponse(**data)
    print(f"Pydantic object: {resp}")
    print(f"JSON model_dump: {resp.model_dump()}")
    print(f"JSON model_dump_json: {resp.model_dump_json()}")

if __name__ == "__main__":
    test_json()
