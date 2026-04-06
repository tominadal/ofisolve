from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import datetime
from typing import List, Optional
import enum

from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "Admin"
    ESCRIBANO = "Escribano"
    EMPLEADO = "Empleado"

class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(index=True) # ID de la escribanía
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    nombre_completo: Mapped[str] = mapped_column(String(100))
    rol: Mapped[UserRole] = mapped_column(String(20), default=UserRole.EMPLEADO)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

class ClienteSaaS(Base):
    __tablename__ = "clientes_saas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(index=True)
    nombre: Mapped[str] = mapped_column(String(150), index=True)
    dni_cuit: Mapped[str] = mapped_column(String(20), index=True)
    tipo_persona: Mapped[str] = mapped_column(String(20), default="Fisica") # Fisica o Juridica
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    participaciones: Mapped[List["ParticipacionSaaS"]] = relationship(back_populates="cliente")

class TramiteSaaS(Base):
    __tablename__ = "tramites_saas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(index=True)
    tipo_acto: Mapped[str] = mapped_column(String(100), index=True)
    estado: Mapped[str] = mapped_column(String(50), default="Borrador")
    thread_id_langgraph: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_extra: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    participaciones: Mapped[List["ParticipacionSaaS"]] = relationship(back_populates="tramite")

class ParticipacionSaaS(Base):
    __tablename__ = "participaciones_saas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes_saas.id"))
    tramite_id: Mapped[int] = mapped_column(ForeignKey("tramites_saas.id"))
    rol: Mapped[str] = mapped_column(String(50)) # Ej: Comprador, Vendedor

    cliente: Mapped["ClienteSaaS"] = relationship(back_populates="participaciones")
    tramite: Mapped["TramiteSaaS"] = relationship(back_populates="participaciones")
