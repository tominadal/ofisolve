"""
Router de Agenda — Módulo ERP Competitivo.
Gestión de turnos, vencimientos, audiencias y recordatorios.
"""

from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.dependencies import limiter
from app.models.db_models import EventoAgenda, Workspace, Cliente, EquipoMiembro
from app.models.finanzas_schemas import EventoAgendaCreate, EventoAgendaResponse

router = APIRouter()


@router.post("/{workspace_id}/agenda", response_model=EventoAgendaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_evento(
    request: Request,
    workspace_id: int,
    evento: EventoAgendaCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea un nuevo evento en la agenda."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Workspace no encontrado")

    nuevo = EventoAgenda(
        workspace_id=workspace_id,
        titulo=evento.titulo,
        descripcion=evento.descripcion,
        tipo=evento.tipo,
        fecha_inicio=evento.fecha_inicio,
        fecha_fin=evento.fecha_fin,
        todo_el_dia=evento.todo_el_dia,
        cliente_id=evento.cliente_id,
        tramite_id=evento.tramite_id,
        asignado_a_id=evento.asignado_a_id,
        color=evento.color,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return await _enrich_evento(nuevo, db)


@router.get("/{workspace_id}/agenda", response_model=List[EventoAgendaResponse])
@limiter.limit("40/minute")
async def listar_eventos(
    request: Request,
    workspace_id: int,
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    tipo: Optional[str] = Query(None),
    completado: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista eventos de la agenda con filtros opcionales por rango de fechas y tipo."""
    stmt = select(EventoAgenda).where(EventoAgenda.workspace_id == workspace_id)

    if fecha_desde:
        stmt = stmt.where(EventoAgenda.fecha_inicio >= datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        stmt = stmt.where(EventoAgenda.fecha_inicio <= datetime.combine(fecha_hasta, datetime.max.time()))
    if tipo:
        stmt = stmt.where(EventoAgenda.tipo == tipo)
    if completado is not None:
        stmt = stmt.where(EventoAgenda.completado == completado)

    stmt = stmt.order_by(EventoAgenda.fecha_inicio.asc())
    result = await db.execute(stmt)
    eventos = result.scalars().all()

    return [await _enrich_evento(e, db) for e in eventos]


@router.get("/{workspace_id}/agenda/vencimientos", response_model=List[EventoAgendaResponse])
@limiter.limit("20/minute")
async def proximos_vencimientos(
    request: Request,
    workspace_id: int,
    dias: int = Query(7, ge=1, le=90, description="Días hacia adelante para buscar vencimientos"),
    db: AsyncSession = Depends(get_db),
):
    """Retorna vencimientos próximos (útil para alertas en el dashboard)."""
    ahora = datetime.utcnow()
    limite = ahora + timedelta(days=dias)

    stmt = (
        select(EventoAgenda)
        .where(
            EventoAgenda.workspace_id == workspace_id,
            EventoAgenda.tipo == "vencimiento",
            EventoAgenda.completado == False,
            EventoAgenda.fecha_inicio >= ahora,
            EventoAgenda.fecha_inicio <= limite,
        )
        .order_by(EventoAgenda.fecha_inicio.asc())
    )
    result = await db.execute(stmt)
    eventos = result.scalars().all()

    return [await _enrich_evento(e, db) for e in eventos]


@router.patch("/{workspace_id}/agenda/{evento_id}", response_model=EventoAgendaResponse)
async def actualizar_evento(workspace_id: int, evento_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    """Actualiza un evento (marcar completado, cambiar fecha, etc.)."""
    result = await db.execute(
        select(EventoAgenda).filter(EventoAgenda.id == evento_id, EventoAgenda.workspace_id == workspace_id)
    )
    evento = result.scalars().first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    allowed = {"titulo", "descripcion", "tipo", "fecha_inicio", "fecha_fin", "todo_el_dia",
               "cliente_id", "tramite_id", "asignado_a_id", "color", "completado"}
    for key, value in data.items():
        if key in allowed:
            # Parse datetime strings from JSON
            if key in ("fecha_inicio", "fecha_fin") and isinstance(value, str):
                value = datetime.fromisoformat(value.replace("Z", "+00:00"))
            setattr(evento, key, value)

    await db.commit()
    await db.refresh(evento)
    return await _enrich_evento(evento, db)


@router.delete("/{workspace_id}/agenda/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_evento(workspace_id: int, evento_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventoAgenda).filter(EventoAgenda.id == evento_id, EventoAgenda.workspace_id == workspace_id)
    )
    evento = result.scalars().first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    await db.delete(evento)
    await db.commit()


# ==============================================================================
# HELPERS
# ==============================================================================

async def _enrich_evento(e: EventoAgenda, db: AsyncSession) -> EventoAgendaResponse:
    """Enriquece un evento con nombres de relaciones para la UI."""
    cli_nombre = None
    asignado_nombre = None

    if e.cliente_id:
        r = await db.execute(select(Cliente.nombre_completo).where(Cliente.id == e.cliente_id))
        cli_nombre = r.scalar()
    if e.asignado_a_id:
        r = await db.execute(select(EquipoMiembro.nombre).where(EquipoMiembro.id == e.asignado_a_id))
        asignado_nombre = r.scalar()

    return EventoAgendaResponse(
        id=e.id, workspace_id=e.workspace_id, titulo=e.titulo,
        descripcion=e.descripcion, tipo=e.tipo,
        fecha_inicio=e.fecha_inicio, fecha_fin=e.fecha_fin,
        todo_el_dia=e.todo_el_dia,
        cliente_id=e.cliente_id, tramite_id=e.tramite_id,
        asignado_a_id=e.asignado_a_id, color=e.color,
        completado=e.completado, recordatorio_enviado=e.recordatorio_enviado,
        fecha_creacion=e.fecha_creacion,
        cliente_nombre=cli_nombre, asignado_a_nombre=asignado_nombre,
    )
