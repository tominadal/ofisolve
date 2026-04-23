from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.dependencies import limiter
from fastapi import Request

from app.core.database import get_db
from app.models.db_models import Workspace, Tramite, Cliente, EquipoMiembro
from app.models.workspace_schemas import (
    WorkspaceCreate, WorkspaceResponse, 
    TramiteCreate, TramiteResponse,
    ClienteCreate, ClienteResponse,
    EquipoMiembroCreate, EquipoMiembroResponse
)

router = APIRouter()

# ==========================================================
# WORKSPACES
# ==========================================================

from sqlalchemy.orm import selectinload

@router.get("/", response_model=List[WorkspaceResponse], status_code=status.HTTP_200_OK)
@limiter.limit("20/minute")
async def read_workspaces(request: Request, skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtiene todos los workspaces del usuario."""
    # Usamos selectinload para cargar las relaciones y evitar errores de lazy loading en async
    stmt = (
        select(Workspace)
        .options(
            selectinload(Workspace.tramites),
            selectinload(Workspace.clientes),
            selectinload(Workspace.equipo)
        )
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_workspace(request: Request, workspace: WorkspaceCreate, db: AsyncSession = Depends(get_db)):
    """Crea un nuevo workspace."""
    nuevo = Workspace(nombre=workspace.nombre, descripcion=workspace.descripcion)
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo

# ==========================================================
# TRAMITES
# ==========================================================

@router.post("/{workspace_id}/tramites", response_model=TramiteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_tramite(request: Request, workspace_id: int, tramite: TramiteCreate, db: AsyncSession = Depends(get_db)):
    """Añade un tramite a un workspace."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    workspace = result.scalars().first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
    nuevo_tramite = Tramite(
        workspace_id=workspace_id,
        nombre=tramite.nombre,
        tipo=tramite.tipo,
        estado=tramite.estado,
        cliente_id=tramite.cliente_id,
        asignado_a_id=tramite.asignado_a_id
    )
    db.add(nuevo_tramite)
    await db.commit()
    await db.refresh(nuevo_tramite)
    return nuevo_tramite

@router.get("/{workspace_id}/tramites", response_model=List[TramiteResponse])
@limiter.limit("40/minute")
async def read_tramites(request: Request, workspace_id: int, db: AsyncSession = Depends(get_db)):
    """Lista trámites de un workspace."""
    result = await db.execute(select(Tramite).filter(Tramite.workspace_id == workspace_id))
    return result.scalars().all()

@router.patch("/tramites/{id}", response_model=TramiteResponse)
async def update_tramite(id: int, tramite_update: dict, db: AsyncSession = Depends(get_db)):
    """Actualiza un trámite de forma parcial (ej: asignación)."""
    result = await db.execute(select(Tramite).filter(Tramite.id == id))
    db_tramite = result.scalars().first()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    for key, value in tramite_update.items():
        if hasattr(db_tramite, key):
            setattr(db_tramite, key, value)
    
    await db.commit()
    await db.refresh(db_tramite)
    return db_tramite

@router.post("/{workspace_id}/tramites/{tramite_id}/aprobar")
async def aprobar_tramite(workspace_id: int, tramite_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    """Aprobar un trámite y marcar como finalizado."""
    result = await db.execute(select(Tramite).filter(Tramite.id == tramite_id, Tramite.workspace_id == workspace_id))
    db_tramite = result.scalars().first()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado en este workspace")
    
    db_tramite.estado = "finalizado"
    # Podríamos guardar el contenido final en algún campo si existiera
    await db.commit()
    return {"status": "success", "message": f"Trámite {tramite_id} aprobado"}

# ==========================================================
# CLIENTES
# ==========================================================

@router.post("/{workspace_id}/clientes", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_cliente(request: Request, workspace_id: int, cliente: ClienteCreate, db: AsyncSession = Depends(get_db)):
    """Añade un cliente a un workspace."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    workspace = result.scalars().first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
    nuevo_cliente = Cliente(
        workspace_id=workspace_id,
        nombre_completo=cliente.nombre_completo,
        dni=cliente.dni,
        cuit=cliente.cuit,
        email=cliente.email,
        telefono=cliente.telefono,
        domicilio=cliente.domicilio,
        tipo_persona=cliente.tipo_persona
    )
    db.add(nuevo_cliente)
    await db.commit()
    await db.refresh(nuevo_cliente)
    return nuevo_cliente

@router.get("/{workspace_id}/clientes", response_model=List[ClienteResponse])
@limiter.limit("40/minute")
async def read_clientes(request: Request, workspace_id: int, db: AsyncSession = Depends(get_db)):
    """Lista clientes de un workspace."""
    result = await db.execute(select(Cliente).filter(Cliente.workspace_id == workspace_id))
    return result.scalars().all()

# ==========================================================
# EQUIPO (MIEMBROS)
# ==========================================================

@router.post("/{workspace_id}/equipo", response_model=EquipoMiembroResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def create_equipo_miembro(request: Request, workspace_id: int, equipo: EquipoMiembroCreate, db: AsyncSession = Depends(get_db)):
    """Añade un miembro de equipo a un workspace."""
    result = await db.execute(select(Workspace).filter(Workspace.id == workspace_id))
    workspace = result.scalars().first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
        
    nuevo_miembro = EquipoMiembro(
        workspace_id=workspace_id,
        nombre=equipo.nombre,
        rol=equipo.rol,
        email=equipo.email
    )
    db.add(nuevo_miembro)
    await db.commit()
    await db.refresh(nuevo_miembro)
    return nuevo_miembro

@router.get("/{workspace_id}/equipo", response_model=List[EquipoMiembroResponse])
@limiter.limit("40/minute")
async def read_equipo(request: Request, workspace_id: int, db: AsyncSession = Depends(get_db)):
    """Lista miembros del equipo de un workspace."""
    result = await db.execute(select(EquipoMiembro).filter(EquipoMiembro.workspace_id == workspace_id))
    return result.scalars().all()

# ==========================================================
# DOCUMENTOS (LIBRERIA)
# ==========================================================

@router.post("/{workspace_id}/documentos")
async def upload_documento(workspace_id: int, request: Request):
    """Endpoint dummy para carga de documentos (mock)."""
    # En un sistema real usaríamos UploadFile, aquí simulamos éxito para que el frontend no falle
    return {"status": "success", "workspace_id": workspace_id, "message": "Documento subido correctamente"}

@router.get("/{workspace_id}/documentos")
async def list_documentos(workspace_id: int):
    """Lista documentos de la librería del workspace (mock)."""
    return [
        {"id": 1, "nombre": "Código Civil y Comercial - Escrituras Públicas y Actas", "tipo": "pdf", "seleccionado": True},
        {"id": 2, "nombre": "Reglamento de Certificaciones - CECBA", "tipo": "pdf", "seleccionado": True}
    ]
