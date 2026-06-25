"""
Router de Clientes — Lee de SQLite real (no de JSON mock).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.db_models import Cliente
from app.models.workspace_schemas import ClienteResponse, ClienteCreate
from app.api.dependencies import limiter

router = APIRouter()


@router.get("", response_model=List[ClienteResponse])
@limiter.limit("40/minute")
async def obtener_clientes(
    request: Request,
    workspace_id: int = Query(None, description="Filtrar por workspace"),
    db: AsyncSession = Depends(get_db),
):
    """
    Obtiene clientes desde la base de datos SQLite real.
    Si se provee workspace_id, filtra por él. Si no, retorna todos.
    """
    stmt = select(Cliente)
    if workspace_id is not None:
        stmt = stmt.where(Cliente.workspace_id == workspace_id)
    result = await db.execute(stmt)
    clientes = result.scalars().all()
    return clientes


@router.post("", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_cliente(
    request: Request,
    cliente: ClienteCreate,
    workspace_id: int = Query(..., description="Workspace al que pertenece el cliente"),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea un nuevo cliente en el workspace especificado.
    """
    nuevo_cliente = Cliente(
        workspace_id=workspace_id,
        nombre_completo=cliente.nombre_completo,
        dni=cliente.dni,
        cuit=cliente.cuit,
        email=cliente.email,
        telefono=cliente.telefono,
        domicilio=cliente.domicilio,
        tipo_persona=cliente.tipo_persona,
    )
    db.add(nuevo_cliente)
    await db.commit()
    await db.refresh(nuevo_cliente)
    return nuevo_cliente


@router.get("/{cliente_id}", response_model=ClienteResponse)
async def obtener_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Obtiene un cliente específico por su ID."""
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = result.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente
