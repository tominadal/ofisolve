from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
import secrets

from app.core.database import get_db
from app.models.db_models import Cliente
from app.models.workspace_schemas import ClienteResponse, ClienteBase

router = APIRouter(prefix="/onboarding", tags=["Onboarding WEB"])

class OnboardingUpdateRequest(BaseModel):
    nacionalidad: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    lugar_nacimiento: Optional[str] = None
    tipo_documento: Optional[str] = None
    emision_documento: Optional[date] = None
    tramite_nro_documento: Optional[str] = None
    ejemplar_documento: Optional[str] = None
    vencimiento_documento: Optional[date] = None

    exhibio_documento_idoneo: Optional[bool] = None
    tipo_documento_impositivo: Optional[str] = None
    cuit: Optional[str] = None
    condicion_iva: Optional[str] = None
    inscripto_ganancias: Optional[bool] = None

    emails_adicionales: Optional[str] = None
    telefonos_adicionales: Optional[str] = None
    pagina_web: Optional[str] = None

    domicilio_calle: Optional[str] = None
    domicilio_numero: Optional[str] = None
    domicilio_piso: Optional[str] = None
    domicilio_depto: Optional[str] = None
    domicilio_cp: Optional[str] = None
    domicilio_localidad: Optional[str] = None
    domicilio_provincia: Optional[str] = None
    domicilio_pais: Optional[str] = None
    domicilio_fiscal_diferente: Optional[bool] = None

    nombre_padre: Optional[str] = None
    apellido_padre: Optional[str] = None
    nombre_madre: Optional[str] = None
    apellido_madre: Optional[str] = None
    estado_familia: Optional[str] = None
    union_convivencial: Optional[bool] = None

@router.get("/{onboarding_token}", response_model=ClienteResponse)
def get_onboarding_cliente(onboarding_token: str, db: Session = Depends(get_db)):
    """Obtiene los datos del cliente a partir de su token único público."""
    cliente = db.query(Cliente).filter(Cliente.onboarding_token == onboarding_token).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Link inválido o expirado")
    return cliente

@router.put("/{onboarding_token}", response_model=ClienteResponse)
def update_onboarding_cliente(
    onboarding_token: str, 
    data: OnboardingUpdateRequest, 
    db: Session = Depends(get_db)
):
    """Actualiza la ficha del cliente mediante el link público."""
    cliente = db.query(Cliente).filter(Cliente.onboarding_token == onboarding_token).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Link inválido o expirado")

    # Actualizamos los datos
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cliente, key, value)

    db.commit()
    db.refresh(cliente)
    return cliente

@router.post("/generar/{cliente_id}")
def generar_link_onboarding(cliente_id: int, db: Session = Depends(get_db)):
    """Genera un token de onboarding y el link para enviar por WhatsApp. 
    Nota: Esta ruta en producción debería estar protegida por auth."""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if not cliente.onboarding_token:
        # Generar token aleatorio seguro
        cliente.onboarding_token = secrets.token_urlsafe(32)
        db.commit()

    link = f"https://ofisolve.app/onboarding/{cliente.onboarding_token}"
    mensaje_whatsapp = (
        f"Estimado/a cliente {cliente.nombre_completo}:\n\n"
        "En referencia a la operación notarial a concretar, enviamos a Ud. el acceso a la ficha de datos personales.\n"
        "Rogamos ingresar y controlar sus datos para evitar errores.\n\n"
        f"Link de acceso seguro: {link}"
    )

    return {
        "onboarding_token": cliente.onboarding_token,
        "link_acceso": link,
        "mensaje_whatsapp": mensaje_whatsapp
    }
