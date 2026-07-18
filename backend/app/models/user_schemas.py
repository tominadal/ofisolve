import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    nombre_completo: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    nro_matricula: Optional[str] = None
    escribania_nombre: Optional[str] = None

class UserUpdate(UserBase):
    password: Optional[str] = None
    nro_matricula: Optional[str] = None
    escribania_nombre: Optional[str] = None

class UserResponse(UserBase):
    id: int
    tenant_id: uuid.UUID
    nro_matricula: Optional[str] = None
    escribania_nombre: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
