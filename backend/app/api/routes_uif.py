"""
Router de Cumplimiento UIF — Módulo ERP Competitivo.
Gestión de Sujetos Obligados, Matriz de Riesgo y Operaciones Sospechosas.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.dependencies import limiter
from app.models.db_models import Cliente, MovimientoFinanciero, Workspace

router = APIRouter()


@router.get("/{workspace_id}/uif/sujetos", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def listar_sujetos_obligados(request: Request, workspace_id: int, db: AsyncSession = Depends(get_db)):
    """Lista todos los clientes con su perfil de riesgo UIF y operaciones."""
    # Verificar workspace
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    # Buscar clientes y contar operaciones vinculadas
    stmt = (
        select(
            Cliente,
            func.count(MovimientoFinanciero.id).label("operaciones_count")
        )
        .outerjoin(MovimientoFinanciero, MovimientoFinanciero.cliente_id == Cliente.id)
        .where(Cliente.workspace_id == workspace_id)
        .group_by(Cliente.id)
        .order_by(Cliente.riesgo_uif.desc(), Cliente.nombre_completo.asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    respuesta = []
    for cliente, op_count in rows:
        respuesta.append({
            "id": cliente.id,
            "nombre": cliente.nombre_completo,
            "cuit": cliente.cuit or cliente.dni or "N/A",
            "nivelRiesgo": cliente.riesgo_uif,
            "ultimaRevision": cliente.uif_ultima_revision.isoformat() if cliente.uif_ultima_revision else "2026-01-01T00:00:00",
            "estado": cliente.uif_estado,
            "operacionesCUI": op_count
        })

    return respuesta
