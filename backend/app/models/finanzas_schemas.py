"""
Schemas Pydantic para los módulos ERP competitivos:
Finanzas, Presupuestos, Agenda, Notas, Proveedores, Plantillas, Aranceles.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# PROVEEDORES
# ==============================================================================

class ProveedorBase(BaseModel):
    nombre_completo: str = Field(..., min_length=2, max_length=200)
    cuit: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    domicilio: Optional[str] = None
    tipo: str = "Gestor"  # Gestor, Perito, Colega, Registro, Otro
    notas: Optional[str] = None

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorResponse(ProveedorBase):
    id: int
    workspace_id: int
    activo: bool
    fecha_creacion: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# CATEGORÍAS FINANCIERAS
# ==============================================================================

class CategoriaFinancieraBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    tipo_default: str = "egreso"
    color: Optional[str] = None
    icono: Optional[str] = None

class CategoriaFinancieraCreate(CategoriaFinancieraBase):
    pass

class CategoriaFinancieraResponse(CategoriaFinancieraBase):
    id: int
    workspace_id: int
    es_sistema: bool

    class Config:
        from_attributes = True


# ==============================================================================
# MOVIMIENTOS FINANCIEROS
# ==============================================================================

class MovimientoFinancieroBase(BaseModel):
    tipo: str = Field(..., pattern=r"^(ingreso|egreso)$")
    monto: Decimal = Field(..., gt=0, decimal_places=2)
    descripcion: str = Field(..., min_length=1, max_length=255)
    fecha: date
    categoria_id: Optional[int] = None
    cliente_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    tramite_id: Optional[int] = None
    comprobante_tipo: Optional[str] = None
    comprobante_nro: Optional[str] = None
    estado: str = "confirmado"

class MovimientoFinancieroCreate(MovimientoFinancieroBase):
    pass

class MovimientoFinancieroResponse(MovimientoFinancieroBase):
    id: int
    workspace_id: int
    fecha_creacion: datetime
    # Nombres expandidos para la UI
    categoria_nombre: Optional[str] = None
    cliente_nombre: Optional[str] = None
    proveedor_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class ResumenFinancieroResponse(BaseModel):
    """KPIs del dashboard financiero."""
    total_ingresos: Decimal
    total_egresos: Decimal
    saldo_neto: Decimal
    pendiente_cobro: Decimal
    cantidad_movimientos: int
    periodo: str  # Ej: "2026-07"


class FlujoCajaMensual(BaseModel):
    """Un punto de datos en el gráfico de flujo de caja."""
    mes: str  # Ej: "2026-01"
    ingresos: Decimal
    egresos: Decimal
    saldo: Decimal


# ==============================================================================
# PRESUPUESTOS
# ==============================================================================

class PresupuestoItemBase(BaseModel):
    concepto: str = Field(..., min_length=1, max_length=200)
    monto: Decimal = Field(..., ge=0)
    es_porcentaje: bool = False
    porcentaje_valor: Optional[Decimal] = None
    orden: int = 0

class PresupuestoItemCreate(PresupuestoItemBase):
    pass

class PresupuestoItemResponse(PresupuestoItemBase):
    id: int
    presupuesto_id: int

    class Config:
        from_attributes = True


class PresupuestoBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    tipo_acto: str = Field(..., min_length=1, max_length=100)
    monto_operacion: Decimal = Field(default=Decimal("0"), ge=0)
    cliente_id: Optional[int] = None
    tramite_id: Optional[int] = None
    observaciones: Optional[str] = None
    fecha_vencimiento: Optional[date] = None

class PresupuestoCreate(PresupuestoBase):
    items: List[PresupuestoItemCreate] = []

class PresupuestoResponse(PresupuestoBase):
    id: int
    workspace_id: int
    estado: str
    total: Decimal = Decimal("0")
    fecha_creacion: datetime
    fecha_envio: Optional[datetime] = None
    items: List[PresupuestoItemResponse] = []
    cliente_nombre: Optional[str] = None

    class Config:
        from_attributes = True


# ==============================================================================
# AGENDA / EVENTOS
# ==============================================================================

class EventoAgendaBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    descripcion: Optional[str] = None
    tipo: str = "turno"  # turno | vencimiento | audiencia | recordatorio
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    todo_el_dia: bool = False
    cliente_id: Optional[int] = None
    tramite_id: Optional[int] = None
    asignado_a_id: Optional[int] = None
    color: Optional[str] = None

class EventoAgendaCreate(EventoAgendaBase):
    pass

class EventoAgendaResponse(EventoAgendaBase):
    id: int
    workspace_id: int
    completado: bool
    recordatorio_enviado: bool
    fecha_creacion: datetime
    cliente_nombre: Optional[str] = None
    asignado_a_nombre: Optional[str] = None

    class Config:
        from_attributes = True


# ==============================================================================
# NOTAS
# ==============================================================================

class NotaBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    contenido: Optional[str] = None
    color: str = "#FEF3C7"
    visibilidad: str = "equipo"  # personal | equipo
    fijada: bool = False

class NotaCreate(NotaBase):
    autor_id: Optional[int] = None

class NotaResponse(NotaBase):
    id: int
    workspace_id: int
    autor_id: Optional[int] = None
    autor_nombre: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# CONFIGURACIÓN DE ARANCELES
# ==============================================================================

class ConfiguracionArancelesBase(BaseModel):
    concepto: str = Field(..., min_length=1, max_length=150)
    tipo_calculo: str = Field(..., pattern=r"^(porcentaje|fijo)$")
    valor: Decimal = Field(..., ge=0)
    minimo: Optional[Decimal] = None
    aplica_a: str = "todos"
    activo: bool = True
    orden: int = 0

class ConfiguracionArancelesCreate(ConfiguracionArancelesBase):
    pass

class ConfiguracionArancelesResponse(ConfiguracionArancelesBase):
    id: int
    workspace_id: int
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True


class CalculoArancelResponse(BaseModel):
    """Resultado de un cálculo automático de aranceles."""
    tipo_acto: str
    monto_operacion: Decimal
    items: List[PresupuestoItemCreate]
    total: Decimal


# ==============================================================================
# PLANTILLAS / BIBLIOTECA DE MODELOS
# ==============================================================================

class PlantillaModeloBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200)
    categoria: str = Field(..., min_length=1, max_length=50)
    contenido: str
    descripcion: Optional[str] = None
    es_favorito: bool = False

class PlantillaModeloCreate(PlantillaModeloBase):
    pass

class PlantillaModeloResponse(PlantillaModeloBase):
    id: int
    workspace_id: int
    uso_count: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    class Config:
        from_attributes = True
