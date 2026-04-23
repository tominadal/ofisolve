from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

# ----------- EQUIPO SCHEMAS -----------

class EquipoMiembroBase(BaseModel):
    nombre: str
    rol: str
    email: Optional[str] = None

class EquipoMiembroCreate(EquipoMiembroBase):
    pass

class EquipoMiembroResponse(EquipoMiembroBase):
    id: int
    workspace_id: int

    class Config:
        from_attributes = True

# ----------- TRAMITE SCHEMAS -----------

class TramiteBase(BaseModel):
    nombre: str
    tipo: str
    estado: str = "abierto"
    cliente_id: Optional[int] = None
    asignado_a_id: Optional[int] = None

class TramiteCreate(TramiteBase):
    pass

class TramiteResponse(TramiteBase):
    id: int
    workspace_id: int
    cliente_id: Optional[int] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    asignado_a: Optional[EquipoMiembroResponse] = None

    class Config:
        from_attributes = True

# ----------- CLIENTE SCHEMAS -----------

class ClienteBase(BaseModel):
    nombre_completo: str
    dni: str
    cuit: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    domicilio: Optional[str] = None
    tipo_persona: str = "Fisica"

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    workspace_id: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True

# ----------- WORKSPACE SCHEMAS -----------

class WorkspaceBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceResponse(WorkspaceBase):
    id: int
    fecha_creacion: datetime
    tramites: List[TramiteResponse] = []
    clientes: List[ClienteResponse] = []
    equipo: List[EquipoMiembroResponse] = []

    class Config:
        from_attributes = True
