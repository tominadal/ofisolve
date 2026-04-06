from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
import datetime
from typing import List, Optional

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    nombre_completo: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True)
    descripcion: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)
    
    tramites: Mapped[List["Tramite"]] = relationship(back_populates="workspace", cascade="all, delete")
    clientes: Mapped[List["Cliente"]] = relationship(back_populates="workspace", cascade="all, delete")
    equipo: Mapped[List["EquipoMiembro"]] = relationship(back_populates="workspace", cascade="all, delete")
    documentos: Mapped[List["DocumentoLibreria"]] = relationship(back_populates="workspace", cascade="all, delete")

class DocumentoLibreria(Base):
    __tablename__ = "documentos_libreria"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    nombre: Mapped[str] = mapped_column(String(150))
    tipo: Mapped[str] = mapped_column(String(50)) # pdf, docx, etc.
    path: Mapped[str] = mapped_column(String(255))
    fecha_subida: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship(back_populates="documentos")

class EquipoMiembro(Base):
    __tablename__ = "equipo_miembros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    nombre: Mapped[str] = mapped_column(String(100))
    rol: Mapped[str] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    workspace: Mapped["Workspace"] = relationship(back_populates="equipo")

class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    nombre_completo: Mapped[str] = mapped_column(String(150), index=True)
    dni: Mapped[str] = mapped_column(String(20), index=True)
    cuit: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    domicilio: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tipo_persona: Mapped[str] = mapped_column(String(20), default="Fisica") # Fisica o Juridica
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship(back_populates="clientes")
    participaciones: Mapped[List["Participacion"]] = relationship(back_populates="cliente")

class Tramite(Base):
    __tablename__ = "tramites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id"))
    asignado_a_id: Mapped[Optional[int]] = mapped_column(ForeignKey("equipo_miembros.id"), nullable=True)
    nombre: Mapped[str] = mapped_column(String(100), index=True)
    tipo: Mapped[str] = mapped_column(String(50))
    estado: Mapped[str] = mapped_column(String(50), default="abierto")
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_creacion: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)
    fecha_actualizacion: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    workspace: Mapped["Workspace"] = relationship(back_populates="tramites")
    asignado_a: Mapped[Optional["EquipoMiembro"]] = relationship()
    participaciones: Mapped[List["Participacion"]] = relationship(back_populates="tramite")

class Participacion(Base):
    __tablename__ = "participaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    tramite_id: Mapped[int] = mapped_column(ForeignKey("tramites.id"))
    rol: Mapped[str] = mapped_column(String(100)) # Ej: Comprador, Vendedor, Requirente

    cliente: Mapped["Cliente"] = relationship(back_populates="participaciones")
    tramite: Mapped["Tramite"] = relationship(back_populates="participaciones")

