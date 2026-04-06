import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Path to the clients JSON mock db
CLIENTES_FILE = Path(__file__).parent.parent.parent / "data" / "clientes.json"

@router.get("", response_model=List[Dict[str, Any]])
async def obtener_clientes(workspace_id: Optional[int] = Query(None)):
    """
    Obtiene la lista de clientes ficticios mockeados.
    """
    try:
        if not CLIENTES_FILE.exists():
            return []
        
        with open(CLIENTES_FILE, "r", encoding="utf-8") as file:
            clientes = json.load(file)
            return clientes
    except Exception as e:
        logger.error(f"Error parseando clientes.json: {e}")
        raise HTTPException(status_code=500, detail="Error de servidor leyendo clientes")

@router.post("", status_code=201)
async def crear_cliente_mock(cliente: Dict[str, Any], workspace_id: Optional[int] = Query(None)):
    """
    Endpoint mock para crear clientes y evitar errores 405 en desarrollo.
    """
    return {"status": "success", "message": "Cliente creado (MOCK)", "data": cliente}
