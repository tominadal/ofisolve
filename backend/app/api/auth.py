from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.models.db_models import Usuario # Modelo Unificado SaaS
from app.models import user_schemas
from app.core.config import get_settings

router = APIRouter(tags=["Autenticación"])
settings = get_settings()

@router.post("/login", response_model=user_schemas.Token)
async def login(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login.
    """
    result = await db.execute(select(Usuario).filter(Usuario.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
        
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    return {
        "access_token": create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=user_schemas.UserResponse)
async def read_user_me(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Obtener usuario actual.
    Adaptado para devolver el esquema SaaS (con tenant_id).
    """
    # Para el MVP, devolvemos el primer usuario que encontremos si no hay sesión real aún
    result = await db.execute(select(Usuario).limit(1))
    user = result.scalars().first()
    
    if not user:
        # Si no hay usuarios, creamos uno administrativo inicial para que la app no rompa
        user = Usuario(
            email="admin@ofisolve.com",
            hashed_password=get_password_hash("admin123"),
            nombre="Administrador Sistema",
            rol="Admin",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    # Mapeo de campos: nombre (DB) a nombre_completo (Schema)
    return {
        "id": user.id,
        "email": user.email,
        "nombre_completo": user.nombre_completo,
        "is_active": user.is_active,
        "tenant_id": "00000000-0000-0000-0000-000000000001" # Default local tenant
    }

@router.post("/register", response_model=user_schemas.UserResponse)
async def register(
    user_in: user_schemas.UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Crear nuevo usuario y su workspace inicial.
    """
    # 1. Verificar si el usuario ya existe
    result = await db.execute(select(Usuario).filter(Usuario.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="El usuario ya existe en este sistema local.",
        )
    
    # 2. Crear Workspace por defecto (obligatorio para el frontend)
    from app.models.db_models import Workspace
    nuevo_workspace = Workspace(
        nombre=f"Oficina de {user_in.nombre_completo or 'Nuevo Usuario'}",
        descripcion="Workspace personal creado automáticamente al registrarse."
    )
    db.add(nuevo_workspace)
    await db.flush() # Para obtener el ID del workspace
    
    # 3. Crear Usuario
    nuevo_usuario = Usuario(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        nombre_completo=user_in.nombre_completo,
        workspace_id=nuevo_workspace.id,
        rol="Escribano",
        is_active=True
    )
    db.add(nuevo_usuario)
    
    await db.commit()
    await db.refresh(nuevo_usuario)
    
    return {
        "id": nuevo_usuario.id,
        "email": nuevo_usuario.email,
        "nombre_completo": nuevo_usuario.nombre_completo,
        "is_active": nuevo_usuario.is_active,
        "tenant_id": "00000000-0000-0000-0000-000000000001"
    }

