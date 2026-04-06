from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.models import db_models, user_schemas
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["Autenticación"])
settings = get_settings()

@router.post("/login", response_model=user_schemas.Token)
async def login(
    db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    result = await db.execute(select(db_models.User).filter(db_models.User.email == form_data.username))
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

@router.post("/register", response_model=user_schemas.UserResponse)
async def register(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: user_schemas.UserCreate,
) -> Any:
    """
    Crear nuevo usuario.
    """
    result = await db.execute(select(db_models.User).filter(db_models.User.email == user_in.email))
    user = result.scalars().first()
    
    if user:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario con este email.",
        )
    
    db_obj = db_models.User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        nombre_completo=user_in.nombre_completo,
        is_active=True,
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.get("/me", response_model=user_schemas.UserResponse)
async def read_user_me(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Obtener usuario actual (simulado con el primer usuario por ahora).
    TODO: Integrar con get_current_user dependencias.
    """
    result = await db.execute(select(db_models.User).limit(1))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
