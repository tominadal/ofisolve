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
    """Actualiza un trámite de forma parcial (ej: asignación, estado)."""
    result = await db.execute(select(Tramite).filter(Tramite.id == id))
    db_tramite = result.scalars().first()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    allowed = {"nombre", "tipo", "estado", "descripcion", "asignado_a_id", "cliente_id"}
    for key, value in tramite_update.items():
        if key in allowed and hasattr(db_tramite, key):
            setattr(db_tramite, key, value)
    
    await db.commit()
    await db.refresh(db_tramite)
    return db_tramite


@router.delete("/{workspace_id}/tramites/{tramite_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def delete_tramite(request: Request, workspace_id: int, tramite_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina un trámite y todo su historial de chat y documentos asociados."""
    from sqlalchemy import delete as sql_delete
    from app.models.db_models import MensajeChat, DocumentoLibreria

    result = await db.execute(select(Tramite).filter(Tramite.id == tramite_id, Tramite.workspace_id == workspace_id))
    db_tramite = result.scalars().first()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")

    # Limpiar registros relacionados primero (cascade manual)
    await db.execute(sql_delete(MensajeChat).where(MensajeChat.tramite_id == tramite_id))
    await db.execute(sql_delete(DocumentoLibreria).where(DocumentoLibreria.tramite_id == tramite_id))
    await db.delete(db_tramite)
    await db.commit()


@router.post("/{workspace_id}/tramites/{tramite_id}/aprobar")
async def aprobar_tramite(workspace_id: int, tramite_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    """Aprobar un trámite y marcar como finalizado."""
    result = await db.execute(select(Tramite).filter(Tramite.id == tramite_id, Tramite.workspace_id == workspace_id))
    db_tramite = result.scalars().first()
    if not db_tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado en este workspace")
    
    db_tramite.estado = "finalizado"
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


@router.patch("/{workspace_id}/clientes/{cliente_id}", response_model=ClienteResponse)
async def update_cliente(workspace_id: int, cliente_id: int, update_data: dict, db: AsyncSession = Depends(get_db)):
    """Edita un cliente existente."""
    result = await db.execute(select(Cliente).filter(Cliente.id == cliente_id, Cliente.workspace_id == workspace_id))
    cliente = result.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    allowed = {"nombre_completo", "cuit", "email", "telefono", "domicilio", "tipo_persona"}
    for key, value in update_data.items():
        if key in allowed and hasattr(cliente, key):
            setattr(cliente, key, value)
    await db.commit()
    await db.refresh(cliente)
    return cliente


@router.delete("/{workspace_id}/clientes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cliente(workspace_id: int, cliente_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina un cliente del workspace."""
    result = await db.execute(select(Cliente).filter(Cliente.id == cliente_id, Cliente.workspace_id == workspace_id))
    cliente = result.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    await db.delete(cliente)
    await db.commit()

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
# DOCUMENTOS (LIBRERÍA) — Delegado a routes_upload.py
# ==========================================================

@router.post("/{workspace_id}/documentos")
async def upload_documento_workspace(
    workspace_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload de documentos al workspace. Delega al motor real de upload.
    Acepta multipart/form-data con campo 'file' y 'tramite_id' opcional.
    """
    import os
    from fastapi import UploadFile, Form
    from app.models import db_models
    from app.rag.rag_service import RAGService

    form = await request.form()
    file: UploadFile = form.get("file")
    tramite_id_raw = form.get("tramite_id")
    tramite_id = int(tramite_id_raw) if tramite_id_raw else None

    if not file:
        return {"status": "error", "message": "No se proveyó ningún archivo"}

    content = await file.read()
    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    safe_name = f"ws_{workspace_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    db_doc = db_models.DocumentoLibreria(
        workspace_id=workspace_id,
        tramite_id=tramite_id,
        nombre=file.filename,
        tipo=file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "txt",
        path=file_path
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    # Indexar en RAG
    try:
        rag_service = RAGService()
        if tramite_id:
            chunks = rag_service.indexar_documento_tramite(
                tramite_id=tramite_id,
                doc_id=db_doc.id,
                contenido_bytes=content,
                nombre=file.filename,
                tipo_doc=db_doc.tipo,
            )
            logger.info(f"[Upload] '{file.filename}' indexado: {chunks} chunks en tramite_{tramite_id}")
        else:
            from app.rag.rag_service import _extract_text
            texto = _extract_text("", content, file.filename)
            rag_service.agregar_documento_dinamico(contenido=texto, nombre=file.filename, tipo_doc=db_doc.tipo)
    except Exception as e:
        logger.warning(f"[Upload] Error indexando en RAG (no crítico): {e}")

    return {
        "id": db_doc.id,
        "nombre": db_doc.nombre,
        "tipo": db_doc.tipo,
        "workspace_id": workspace_id,
        "tramite_id": tramite_id,
        "path": db_doc.path,
        "status": "success"
    }


@router.get("/{workspace_id}/documentos")
async def list_documentos_workspace(workspace_id: int, db: AsyncSession = Depends(get_db)):
    """Lista documentos reales del workspace desde SQLite."""
    from app.models.db_models import DocumentoLibreria
    result = await db.execute(
        select(DocumentoLibreria).where(
            DocumentoLibreria.workspace_id == workspace_id,
            DocumentoLibreria.is_generated == False
        )
    )
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "titulo": d.nombre,
            "nombre": d.nombre,
            "tipo": d.tipo,
            "fuente": d.path,
            "workspace_id": d.workspace_id,
            "tramite_id": d.tramite_id,
        }
        for d in docs
    ]
