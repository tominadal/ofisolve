"""
Router de Presupuestos y Calculadora de Aranceles — Módulo ERP Competitivo.
Incluye CRUD de presupuestos con ítems anidados, cálculo automático de aranceles,
y generación de PDF local.
"""

from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import io

from app.core.database import get_db
from app.api.dependencies import limiter
from app.models.db_models import (
    Workspace, Presupuesto, PresupuestoItem,
    ConfiguracionAranceles, Cliente,
)
from app.models.finanzas_schemas import (
    PresupuestoCreate, PresupuestoResponse, PresupuestoItemResponse,
    ConfiguracionArancelesCreate, ConfiguracionArancelesResponse,
    CalculoArancelResponse, PresupuestoItemCreate,
)

router = APIRouter()


# ==============================================================================
# PRESUPUESTOS
# ==============================================================================

@router.post("/{workspace_id}/presupuestos", response_model=PresupuestoResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_presupuesto(
    request: Request,
    workspace_id: int,
    data: PresupuestoCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea un presupuesto completo con todos sus ítems en una sola transacción."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    presupuesto = Presupuesto(
        workspace_id=workspace_id,
        titulo=data.titulo,
        tipo_acto=data.tipo_acto,
        monto_operacion=data.monto_operacion,
        cliente_id=data.cliente_id,
        tramite_id=data.tramite_id,
        observaciones=data.observaciones,
        fecha_vencimiento=data.fecha_vencimiento,
    )
    db.add(presupuesto)
    await db.flush()  # Get ID before adding items

    for i, item_data in enumerate(data.items):
        item = PresupuestoItem(
            presupuesto_id=presupuesto.id,
            concepto=item_data.concepto,
            monto=item_data.monto,
            es_porcentaje=item_data.es_porcentaje,
            porcentaje_valor=item_data.porcentaje_valor,
            orden=item_data.orden or i,
        )
        db.add(item)

    await db.commit()
    return await _get_presupuesto_full(presupuesto.id, db)


@router.get("/{workspace_id}/presupuestos", response_model=List[PresupuestoResponse])
@limiter.limit("40/minute")
async def listar_presupuestos(
    request: Request,
    workspace_id: int,
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista presupuestos con filtro opcional por estado."""
    stmt = (
        select(Presupuesto)
        .where(Presupuesto.workspace_id == workspace_id)
        .options(selectinload(Presupuesto.items))
        .order_by(Presupuesto.fecha_creacion.desc())
    )
    if estado:
        stmt = stmt.where(Presupuesto.estado == estado)

    result = await db.execute(stmt)
    presupuestos = result.scalars().all()

    enriched = []
    for p in presupuestos:
        cli_nombre = None
        if p.cliente_id:
            r = await db.execute(select(Cliente.nombre_completo).where(Cliente.id == p.cliente_id))
            cli_nombre = r.scalar()

        enriched.append(PresupuestoResponse(
            id=p.id, workspace_id=p.workspace_id, titulo=p.titulo,
            tipo_acto=p.tipo_acto, monto_operacion=p.monto_operacion,
            estado=p.estado, cliente_id=p.cliente_id, tramite_id=p.tramite_id,
            observaciones=p.observaciones, fecha_vencimiento=p.fecha_vencimiento,
            fecha_creacion=p.fecha_creacion, fecha_envio=p.fecha_envio,
            total=p.total,
            items=[PresupuestoItemResponse.model_validate(i) for i in p.items],
            cliente_nombre=cli_nombre,
        ))
    return enriched


@router.get("/{workspace_id}/presupuestos/{presupuesto_id}", response_model=PresupuestoResponse)
async def obtener_presupuesto(workspace_id: int, presupuesto_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_presupuesto_full(presupuesto_id, db)


@router.patch("/{workspace_id}/presupuestos/{presupuesto_id}", response_model=PresupuestoResponse)
async def actualizar_estado_presupuesto(
    workspace_id: int,
    presupuesto_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza el estado u observaciones de un presupuesto."""
    result = await db.execute(
        select(Presupuesto).filter(
            Presupuesto.id == presupuesto_id,
            Presupuesto.workspace_id == workspace_id,
        )
    )
    pres = result.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    allowed = {"estado", "observaciones", "fecha_vencimiento"}
    import datetime
    for key, value in data.items():
        if key in allowed:
            if key == "estado" and value == "enviado" and pres.estado == "borrador":
                pres.fecha_envio = datetime.datetime.utcnow()
            setattr(pres, key, value)

    await db.commit()
    return await _get_presupuesto_full(presupuesto_id, db)


@router.delete("/{workspace_id}/presupuestos/{presupuesto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_presupuesto(workspace_id: int, presupuesto_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Presupuesto).filter(
            Presupuesto.id == presupuesto_id,
            Presupuesto.workspace_id == workspace_id,
        )
    )
    pres = result.scalars().first()
    if not pres:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    await db.delete(pres)
    await db.commit()


# ==============================================================================
# CALCULADORA DE ARANCELES
# ==============================================================================

@router.get("/{workspace_id}/aranceles", response_model=List[ConfiguracionArancelesResponse])
async def listar_aranceles(workspace_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfiguracionAranceles)
        .where(ConfiguracionAranceles.workspace_id == workspace_id, ConfiguracionAranceles.activo == True)
        .order_by(ConfiguracionAranceles.orden)
    )
    return result.scalars().all()


@router.post("/{workspace_id}/aranceles", response_model=ConfiguracionArancelesResponse, status_code=status.HTTP_201_CREATED)
async def crear_arancel(workspace_id: int, arancel: ConfiguracionArancelesCreate, db: AsyncSession = Depends(get_db)):
    nuevo = ConfiguracionAranceles(workspace_id=workspace_id, **arancel.model_dump())
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo


@router.patch("/{workspace_id}/aranceles/{arancel_id}", response_model=ConfiguracionArancelesResponse)
async def actualizar_arancel(workspace_id: int, arancel_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ConfiguracionAranceles).filter(
            ConfiguracionAranceles.id == arancel_id,
            ConfiguracionAranceles.workspace_id == workspace_id,
        )
    )
    arancel = result.scalars().first()
    if not arancel:
        raise HTTPException(status_code=404, detail="Arancel no encontrado")

    allowed = {"concepto", "tipo_calculo", "valor", "minimo", "aplica_a", "activo", "orden"}
    for key, value in data.items():
        if key in allowed:
            setattr(arancel, key, value)
    await db.commit()
    await db.refresh(arancel)
    return arancel


@router.post("/{workspace_id}/aranceles/calcular", response_model=CalculoArancelResponse)
async def calcular_aranceles(
    workspace_id: int,
    tipo_acto: str = Query(..., description="Tipo de acto notarial"),
    monto: Decimal = Query(..., gt=0, description="Monto de la operación"),
    db: AsyncSession = Depends(get_db),
):
    """
    Calcula automáticamente los aranceles para un tipo de acto y monto dados.
    Usa la configuración de aranceles del workspace.
    """
    stmt = (
        select(ConfiguracionAranceles)
        .where(
            ConfiguracionAranceles.workspace_id == workspace_id,
            ConfiguracionAranceles.activo == True,
            ConfiguracionAranceles.aplica_a.in_(["todos", tipo_acto.lower()]),
        )
        .order_by(ConfiguracionAranceles.orden)
    )
    result = await db.execute(stmt)
    aranceles = result.scalars().all()

    items = []
    total = Decimal("0")

    for a in aranceles:
        if a.tipo_calculo == "porcentaje":
            monto_item = monto * a.valor
            if a.minimo and monto_item < a.minimo:
                monto_item = a.minimo
        else:
            monto_item = a.valor

        monto_item = monto_item.quantize(Decimal("0.01"))
        items.append(PresupuestoItemCreate(
            concepto=a.concepto,
            monto=monto_item,
            es_porcentaje=(a.tipo_calculo == "porcentaje"),
            porcentaje_valor=a.valor if a.tipo_calculo == "porcentaje" else None,
        ))
        total += monto_item

    return CalculoArancelResponse(
        tipo_acto=tipo_acto,
        monto_operacion=monto,
        items=items,
        total=total,
    )


# ==============================================================================
# HELPERS
# ==============================================================================

async def _get_presupuesto_full(presupuesto_id: int, db: AsyncSession) -> PresupuestoResponse:
    """Carga un presupuesto con sus ítems y nombre de cliente."""
    result = await db.execute(
        select(Presupuesto)
        .where(Presupuesto.id == presupuesto_id)
        .options(selectinload(Presupuesto.items))
    )
    p = result.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    cli_nombre = None
    if p.cliente_id:
        r = await db.execute(select(Cliente.nombre_completo).where(Cliente.id == p.cliente_id))
        cli_nombre = r.scalar()

    return PresupuestoResponse(
        id=p.id, workspace_id=p.workspace_id, titulo=p.titulo,
        tipo_acto=p.tipo_acto, monto_operacion=p.monto_operacion,
        estado=p.estado, cliente_id=p.cliente_id, tramite_id=p.tramite_id,
        observaciones=p.observaciones, fecha_vencimiento=p.fecha_vencimiento,
        fecha_creacion=p.fecha_creacion, fecha_envio=p.fecha_envio,
        total=p.total,
        items=[PresupuestoItemResponse.model_validate(i) for i in p.items],
        cliente_nombre=cli_nombre,
    )
