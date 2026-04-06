import datetime
import uuid
from enum import Enum as PyEnum
from typing import List, Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class UserRole(str, PyEnum):
    ADMIN = "Admin"
    ESCRIBANO = "Escribano"
    EMPLEADO = "Empleado"

class Usuario(Base):
    """Gestión de personal de la escribanía (Multi-Tenancy)."""
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(100))
    rol: Mapped[UserRole] = mapped_column(String(20), default=UserRole.EMPLEADO)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

class Cliente(Base):
    """Empresas o personas físicas requirentes del servicio."""
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    nombre: Mapped[str] = mapped_column(String(150), index=True)
    dni_cuit: Mapped[str] = mapped_column(String(20), index=True)
    tipo_persona: Mapped[str] = mapped_column(String(20), default="Fisica") # Fisica o Juridica
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    domicilio: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fecha_registro: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    participaciones: Mapped[List["Participacion"]] = relationship(back_populates="cliente")

class Tramite(Base):
    """Operación notarial (Certificación, Poder, etc.)."""
    __tablename__ = "tramites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    tipo_acto: Mapped[str] = mapped_column(String(100)) 
    estado: Mapped[str] = mapped_column(String(50), default="Abierto") # Abierto, Validando, Aprobado
    thread_id_langgraph: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_extra: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # Datos extraídos o historial
    fecha_inicio: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    participaciones: Mapped[List["Participacion"]] = relationship(back_populates="tramite", cascade="all, delete-orphan")

class Participacion(Base):
    """Vincula Clientes con Trámites definiendo su Rol (Vendedor, Comprador, etc.)."""
    __tablename__ = "participaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    tramite_id: Mapped[int] = mapped_column(ForeignKey("tramites.id"))
    rol: Mapped[str] = mapped_column(String(100)) # Ej: Requirente, Mandante, Apoderado

    cliente: Mapped["Cliente"] = relationship(back_populates="participaciones")
    tramite: Mapped["Tramite"] = relationship(back_populates="participaciones")
