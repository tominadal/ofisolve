"""
Router de Notas y Biblioteca de Plantillas — Módulo ERP Competitivo.
Notas colaborativas tipo Post-it + Biblioteca de modelos de documentos.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.dependencies import limiter
from app.models.db_models import Nota, PlantillaModelo, Workspace, EquipoMiembro
from app.models.finanzas_schemas import (
    NotaCreate, NotaResponse,
    PlantillaModeloCreate, PlantillaModeloResponse,
)

router = APIRouter()


# ==============================================================================
# NOTAS COLABORATIVAS
# ==============================================================================

@router.post("/{workspace_id}/notas", response_model=NotaResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_nota(request: Request, workspace_id: int, nota: NotaCreate, db: AsyncSession = Depends(get_db)):
    """Crea una nueva nota personal o de equipo."""
    nueva = Nota(
        workspace_id=workspace_id,
        titulo=nota.titulo,
        contenido=nota.contenido,
        color=nota.color,
        visibilidad=nota.visibilidad,
        fijada=nota.fijada,
        autor_id=nota.autor_id,
    )
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    return await _enrich_nota(nueva, db)


@router.get("/{workspace_id}/notas", response_model=List[NotaResponse])
@limiter.limit("40/minute")
async def listar_notas(
    request: Request,
    workspace_id: int,
    visibilidad: Optional[str] = Query(None, description="personal o equipo"),
    db: AsyncSession = Depends(get_db),
):
    """Lista notas del workspace. Filtra opcionalmente por visibilidad."""
    stmt = select(Nota).where(Nota.workspace_id == workspace_id)
    if visibilidad:
        stmt = stmt.where(Nota.visibilidad == visibilidad)
    # Fijadas primero, luego por fecha descendente
    stmt = stmt.order_by(Nota.fijada.desc(), Nota.fecha_actualizacion.desc())

    result = await db.execute(stmt)
    notas = result.scalars().all()
    return [await _enrich_nota(n, db) for n in notas]


@router.patch("/{workspace_id}/notas/{nota_id}", response_model=NotaResponse)
async def actualizar_nota(workspace_id: int, nota_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Nota).filter(Nota.id == nota_id, Nota.workspace_id == workspace_id)
    )
    nota = result.scalars().first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota no encontrada")

    allowed = {"titulo", "contenido", "color", "visibilidad", "fijada"}
    for key, value in data.items():
        if key in allowed:
            setattr(nota, key, value)

    await db.commit()
    await db.refresh(nota)
    return await _enrich_nota(nota, db)


@router.delete("/{workspace_id}/notas/{nota_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_nota(workspace_id: int, nota_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Nota).filter(Nota.id == nota_id, Nota.workspace_id == workspace_id)
    )
    nota = result.scalars().first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    await db.delete(nota)
    await db.commit()


# ==============================================================================
# BIBLIOTECA DE PLANTILLAS / MODELOS
# ==============================================================================

@router.post("/{workspace_id}/plantillas", response_model=PlantillaModeloResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_plantilla(request: Request, workspace_id: int, plantilla: PlantillaModeloCreate, db: AsyncSession = Depends(get_db)):
    """Guarda un nuevo modelo/plantilla en la biblioteca."""
    nueva = PlantillaModelo(workspace_id=workspace_id, **plantilla.model_dump())
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    return nueva


@router.get("/{workspace_id}/plantillas", response_model=List[PlantillaModeloResponse])
@limiter.limit("40/minute")
async def listar_plantillas(
    request: Request,
    workspace_id: int,
    categoria: Optional[str] = Query(None),
    favoritos: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista plantillas de la biblioteca con filtros opcionales."""
    stmt = select(PlantillaModelo).where(PlantillaModelo.workspace_id == workspace_id)
    if categoria:
        stmt = stmt.where(PlantillaModelo.categoria == categoria)
    if favoritos:
        stmt = stmt.where(PlantillaModelo.es_favorito == True)
    stmt = stmt.order_by(PlantillaModelo.es_favorito.desc(), PlantillaModelo.uso_count.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{workspace_id}/plantillas/{plantilla_id}", response_model=PlantillaModeloResponse)
async def obtener_plantilla(workspace_id: int, plantilla_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlantillaModelo).filter(
            PlantillaModelo.id == plantilla_id,
            PlantillaModelo.workspace_id == workspace_id,
        )
    )
    plantilla = result.scalars().first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return plantilla


@router.patch("/{workspace_id}/plantillas/{plantilla_id}", response_model=PlantillaModeloResponse)
async def actualizar_plantilla(workspace_id: int, plantilla_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlantillaModelo).filter(
            PlantillaModelo.id == plantilla_id,
            PlantillaModelo.workspace_id == workspace_id,
        )
    )
    plantilla = result.scalars().first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    allowed = {"nombre", "categoria", "contenido", "descripcion", "es_favorito"}
    for key, value in data.items():
        if key in allowed:
            setattr(plantilla, key, value)
    await db.commit()
    await db.refresh(plantilla)
    return plantilla


@router.post("/{workspace_id}/plantillas/{plantilla_id}/usar", response_model=PlantillaModeloResponse)
async def usar_plantilla(workspace_id: int, plantilla_id: int, db: AsyncSession = Depends(get_db)):
    """Incrementa el contador de uso de una plantilla (tracking de popularidad)."""
    result = await db.execute(
        select(PlantillaModelo).filter(
            PlantillaModelo.id == plantilla_id,
            PlantillaModelo.workspace_id == workspace_id,
        )
    )
    plantilla = result.scalars().first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    plantilla.uso_count += 1
    await db.commit()
    await db.refresh(plantilla)
    return plantilla


@router.delete("/{workspace_id}/plantillas/{plantilla_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_plantilla(workspace_id: int, plantilla_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PlantillaModelo).filter(
            PlantillaModelo.id == plantilla_id,
            PlantillaModelo.workspace_id == workspace_id,
        )
    )
    plantilla = result.scalars().first()
    if not plantilla:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    await db.delete(plantilla)
    await db.commit()


# ==============================================================================
# HELPERS
# ==============================================================================

async def _enrich_nota(n: Nota, db: AsyncSession) -> NotaResponse:
    autor_nombre = None
    if n.autor_id:
        r = await db.execute(select(EquipoMiembro.nombre).where(EquipoMiembro.id == n.autor_id))
        autor_nombre = r.scalar()

    return NotaResponse(
        id=n.id, workspace_id=n.workspace_id, titulo=n.titulo,
        contenido=n.contenido, color=n.color, visibilidad=n.visibilidad,
        fijada=n.fijada, autor_id=n.autor_id, autor_nombre=autor_nombre,
        fecha_creacion=n.fecha_creacion, fecha_actualizacion=n.fecha_actualizacion,
    )
