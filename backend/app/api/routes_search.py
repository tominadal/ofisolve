from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.models.db_models import Cliente, Tramite

router = APIRouter()

@router.get("/")
async def global_search(
    workspace_id: int,
    q: str = Query("", min_length=1, description="Texto a buscar"),
    db: AsyncSession = Depends(get_db)
):
    """
    Buscador global maestro: busca en clientes y trámites.
    """
    if not q or len(q) < 1:
        return {"clientes": [], "tramites": []}
    
    # 1. Buscar Clientes
    stmt_clientes = select(Cliente).where(
        (Cliente.workspace_id == workspace_id) &
        (or_(
            Cliente.nombre_completo.ilike(f"%{q}%"),
            Cliente.dni.ilike(f"%{q}%"),
            Cliente.cuit.ilike(f"%{q}%"),
            Cliente.email.ilike(f"%{q}%")
        ))
    ).limit(10)
    res_cli = await db.execute(stmt_clientes)
    clientes = res_cli.scalars().all()
    
    # 2. Buscar Trámites
    stmt_tramites = select(Tramite).where(
        (Tramite.workspace_id == workspace_id) &
        (or_(
            Tramite.nombre.ilike(f"%{q}%"),
            Tramite.descripcion.ilike(f"%{q}%")
        ))
    ).limit(10)
    res_tram = await db.execute(stmt_tramites)
    tramites = res_tram.scalars().all()
    
    return {
        "clientes": [
            {
                "id": c.id,
                "nombre": c.nombre_completo,
                "dni": c.dni,
                "tipo": "cliente"
            } for c in clientes
        ],
        "tramites": [
            {
                "id": t.id,
                "nombre": t.nombre,
                "estado": t.estado,
                "clienteId": t.cliente_id,
                "tipo": "tramite"
            } for t in tramites
        ]
    }
