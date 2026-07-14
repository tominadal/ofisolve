"""
Router de Finanzas, Proveedores y Categorías — Módulo ERP Competitivo.
Incluye movimientos financieros, flujo de caja, resumen y CRUD de proveedores/categorías.
Todas las rutas son workspace-scoped.
"""

from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract, case, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.dependencies import limiter
from app.models.db_models import (
    Workspace, MovimientoFinanciero, CategoriaFinanciera, Proveedor, Cliente
)
from app.models.finanzas_schemas import (
    MovimientoFinancieroCreate, MovimientoFinancieroResponse,
    CategoriaFinancieraCreate, CategoriaFinancieraResponse,
    ProveedorCreate, ProveedorResponse,
    ResumenFinancieroResponse, FlujoCajaMensual,
)

router = APIRouter()


# ==============================================================================
# MOVIMIENTOS FINANCIEROS
# ==============================================================================

@router.post("/{workspace_id}/finanzas/movimientos", response_model=MovimientoFinancieroResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_movimiento(
    request: Request,
    workspace_id: int,
    movimiento: MovimientoFinancieroCreate,
    db: AsyncSession = Depends(get_db),
):
    """Registra un nuevo ingreso o egreso en la escribanía."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    nuevo = MovimientoFinanciero(
        workspace_id=workspace_id,
        tipo=movimiento.tipo,
        monto=movimiento.monto,
        descripcion=movimiento.descripcion,
        fecha=movimiento.fecha,
        categoria_id=movimiento.categoria_id,
        cliente_id=movimiento.cliente_id,
        proveedor_id=movimiento.proveedor_id,
        tramite_id=movimiento.tramite_id,
        comprobante_tipo=movimiento.comprobante_tipo,
        comprobante_nro=movimiento.comprobante_nro,
        estado=movimiento.estado,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return await _enrich_movimiento(nuevo, db)


@router.get("/{workspace_id}/finanzas/movimientos", response_model=List[MovimientoFinancieroResponse])
@limiter.limit("40/minute")
async def listar_movimientos(
    request: Request,
    workspace_id: int,
    tipo: Optional[str] = Query(None, description="ingreso o egreso"),
    categoria_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista movimientos financieros con filtros opcionales."""
    stmt = select(MovimientoFinanciero).where(
        MovimientoFinanciero.workspace_id == workspace_id
    )
    if tipo:
        stmt = stmt.where(MovimientoFinanciero.tipo == tipo)
    if categoria_id:
        stmt = stmt.where(MovimientoFinanciero.categoria_id == categoria_id)
    if fecha_desde:
        stmt = stmt.where(MovimientoFinanciero.fecha >= fecha_desde)
    if fecha_hasta:
        stmt = stmt.where(MovimientoFinanciero.fecha <= fecha_hasta)

    stmt = stmt.order_by(MovimientoFinanciero.fecha.desc()).limit(limit)
    result = await db.execute(stmt)
    movimientos = result.scalars().all()

    enriched = []
    for m in movimientos:
        enriched.append(await _enrich_movimiento(m, db))
    return enriched


@router.delete("/{workspace_id}/finanzas/movimientos/{movimiento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_movimiento(workspace_id: int, movimiento_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina un movimiento financiero."""
    result = await db.execute(
        select(MovimientoFinanciero).filter(
            MovimientoFinanciero.id == movimiento_id,
            MovimientoFinanciero.workspace_id == workspace_id
        )
    )
    mov = result.scalars().first()
    if not mov:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    await db.delete(mov)
    await db.commit()


# ==============================================================================
# RESUMEN FINANCIERO (KPIs)
# ==============================================================================

@router.get("/{workspace_id}/finanzas/resumen", response_model=ResumenFinancieroResponse)
@limiter.limit("20/minute")
async def resumen_financiero(
    request: Request,
    workspace_id: int,
    mes: Optional[int] = Query(None, ge=1, le=12),
    anio: Optional[int] = Query(None, ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
):
    """Retorna KPIs financieros del workspace (total ingresos, egresos, saldo)."""
    hoy = date.today()
    mes_filtro = mes or hoy.month
    anio_filtro = anio or hoy.year

    base_filter = and_(
        MovimientoFinanciero.workspace_id == workspace_id,
        extract("month", MovimientoFinanciero.fecha) == mes_filtro,
        extract("year", MovimientoFinanciero.fecha) == anio_filtro,
        MovimientoFinanciero.estado != "anulado",
    )

    # Ingresos
    r_ingresos = await db.execute(
        select(func.coalesce(func.sum(MovimientoFinanciero.monto), 0)).where(
            base_filter, MovimientoFinanciero.tipo == "ingreso"
        )
    )
    total_ingresos = r_ingresos.scalar() or Decimal("0")

    # Egresos
    r_egresos = await db.execute(
        select(func.coalesce(func.sum(MovimientoFinanciero.monto), 0)).where(
            base_filter, MovimientoFinanciero.tipo == "egreso"
        )
    )
    total_egresos = r_egresos.scalar() or Decimal("0")

    # Pendiente de cobro
    r_pendiente = await db.execute(
        select(func.coalesce(func.sum(MovimientoFinanciero.monto), 0)).where(
            MovimientoFinanciero.workspace_id == workspace_id,
            MovimientoFinanciero.tipo == "ingreso",
            MovimientoFinanciero.estado == "pendiente",
        )
    )
    pendiente = r_pendiente.scalar() or Decimal("0")

    # Cantidad
    r_count = await db.execute(
        select(func.count(MovimientoFinanciero.id)).where(base_filter)
    )

    return ResumenFinancieroResponse(
        total_ingresos=total_ingresos,
        total_egresos=total_egresos,
        saldo_neto=total_ingresos - total_egresos,
        pendiente_cobro=pendiente,
        cantidad_movimientos=r_count.scalar() or 0,
        periodo=f"{anio_filtro}-{mes_filtro:02d}",
    )


# ==============================================================================
# FLUJO DE CAJA (Últimos 12 meses)
# ==============================================================================

@router.get("/{workspace_id}/finanzas/flujo-caja", response_model=List[FlujoCajaMensual])
@limiter.limit("20/minute")
async def flujo_caja(
    request: Request,
    workspace_id: int,
    meses: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
):
    """Retorna ingresos/egresos agrupados por mes para gráficos de flujo de caja."""
    from dateutil.relativedelta import relativedelta

    hoy = date.today()
    fecha_inicio = hoy.replace(day=1) - relativedelta(months=meses - 1)

    # Query agrupada por año-mes y tipo
    stmt = (
        select(
            extract("year", MovimientoFinanciero.fecha).label("anio"),
            extract("month", MovimientoFinanciero.fecha).label("mes"),
            MovimientoFinanciero.tipo,
            func.coalesce(func.sum(MovimientoFinanciero.monto), 0).label("total"),
        )
        .where(
            MovimientoFinanciero.workspace_id == workspace_id,
            MovimientoFinanciero.fecha >= fecha_inicio,
            MovimientoFinanciero.estado != "anulado",
        )
        .group_by(
            extract("year", MovimientoFinanciero.fecha),
            extract("month", MovimientoFinanciero.fecha),
            MovimientoFinanciero.tipo,
        )
        .order_by("anio", "mes")
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Construir respuesta con todos los meses (incluyendo vacíos)
    data_map: dict[str, dict] = {}
    for i in range(meses):
        m = fecha_inicio + relativedelta(months=i)
        key = f"{m.year}-{m.month:02d}"
        data_map[key] = {"mes": key, "ingresos": Decimal("0"), "egresos": Decimal("0"), "saldo": Decimal("0")}

    for row in rows:
        key = f"{int(row.anio)}-{int(row.mes):02d}"
        if key in data_map:
            if row.tipo == "ingreso":
                data_map[key]["ingresos"] = row.total
            else:
                data_map[key]["egresos"] = row.total

    resultado = []
    for v in data_map.values():
        v["saldo"] = v["ingresos"] - v["egresos"]
        resultado.append(FlujoCajaMensual(**v))

    return resultado


# ==============================================================================
# CATEGORÍAS FINANCIERAS
# ==============================================================================

@router.get("/{workspace_id}/finanzas/categorias", response_model=List[CategoriaFinancieraResponse])
async def listar_categorias(workspace_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CategoriaFinanciera).where(CategoriaFinanciera.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post("/{workspace_id}/finanzas/categorias", response_model=CategoriaFinancieraResponse, status_code=status.HTTP_201_CREATED)
async def crear_categoria(workspace_id: int, cat: CategoriaFinancieraCreate, db: AsyncSession = Depends(get_db)):
    nueva = CategoriaFinanciera(workspace_id=workspace_id, **cat.model_dump())
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    return nueva


@router.delete("/{workspace_id}/finanzas/categorias/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_categoria(workspace_id: int, cat_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CategoriaFinanciera).filter(
            CategoriaFinanciera.id == cat_id,
            CategoriaFinanciera.workspace_id == workspace_id,
        )
    )
    cat = result.scalars().first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    if cat.es_sistema:
        raise HTTPException(status_code=400, detail="No se pueden eliminar categorías del sistema")
    await db.delete(cat)
    await db.commit()


# ==============================================================================
# PROVEEDORES
# ==============================================================================

@router.get("/{workspace_id}/proveedores", response_model=List[ProveedorResponse])
@limiter.limit("40/minute")
async def listar_proveedores(request: Request, workspace_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Proveedor).where(Proveedor.workspace_id == workspace_id).order_by(Proveedor.nombre_completo)
    )
    return result.scalars().all()


@router.post("/{workspace_id}/proveedores", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_proveedor(request: Request, workspace_id: int, prov: ProveedorCreate, db: AsyncSession = Depends(get_db)):
    nuevo = Proveedor(workspace_id=workspace_id, **prov.model_dump())
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo


@router.patch("/{workspace_id}/proveedores/{prov_id}", response_model=ProveedorResponse)
async def actualizar_proveedor(workspace_id: int, prov_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Proveedor).filter(Proveedor.id == prov_id, Proveedor.workspace_id == workspace_id)
    )
    prov = result.scalars().first()
    if not prov:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    allowed = {"nombre_completo", "cuit", "email", "telefono", "domicilio", "tipo", "notas", "activo"}
    for key, value in data.items():
        if key in allowed:
            setattr(prov, key, value)
    await db.commit()
    await db.refresh(prov)
    return prov


@router.delete("/{workspace_id}/proveedores/{prov_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_proveedor(workspace_id: int, prov_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Proveedor).filter(Proveedor.id == prov_id, Proveedor.workspace_id == workspace_id)
    )
    prov = result.scalars().first()
    if not prov:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(prov)
    await db.commit()


# ==============================================================================
# HELPERS
# ==============================================================================

async def _enrich_movimiento(m: MovimientoFinanciero, db: AsyncSession) -> MovimientoFinancieroResponse:
    """Enriquece un movimiento con nombres de relaciones para la UI."""
    cat_nombre = None
    cli_nombre = None
    prov_nombre = None

    if m.categoria_id:
        r = await db.execute(select(CategoriaFinanciera.nombre).where(CategoriaFinanciera.id == m.categoria_id))
        cat_nombre = r.scalar()
    if m.cliente_id:
        r = await db.execute(select(Cliente.nombre_completo).where(Cliente.id == m.cliente_id))
        cli_nombre = r.scalar()
    if m.proveedor_id:
        r = await db.execute(select(Proveedor.nombre_completo).where(Proveedor.id == m.proveedor_id))
        prov_nombre = r.scalar()

    return MovimientoFinancieroResponse(
        id=m.id, workspace_id=m.workspace_id, tipo=m.tipo, monto=m.monto,
        descripcion=m.descripcion, fecha=m.fecha,
        categoria_id=m.categoria_id, cliente_id=m.cliente_id,
        proveedor_id=m.proveedor_id, tramite_id=m.tramite_id,
        comprobante_tipo=m.comprobante_tipo, comprobante_nro=m.comprobante_nro,
        estado=m.estado, fecha_creacion=m.fecha_creacion,
        categoria_nombre=cat_nombre, cliente_nombre=cli_nombre,
        proveedor_nombre=prov_nombre,
    )
