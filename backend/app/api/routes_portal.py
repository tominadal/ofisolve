from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.core.database import get_db
from app.models.db_models import Tramite, Participacion, Cliente

router = APIRouter(tags=["Portal Helper"])

@router.get("/greeting/{tramite_id}")
async def obtener_saludo_proactivo(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """
    Endpoint ultra-estable para el saludo inicial.
    """
    try:
        stmt = select(Tramite).where(Tramite.id == tramite_id)
        res = await db.execute(stmt)
        tramite = res.scalars().first()
        
        if not tramite:
            return {"mensaje": "Bienvenido al trámite. ¿Cómo podemos ayudarte hoy?"}
            
        return {"mensaje": f"Hola! He abierto la carpeta de {tramite.nombre}. El tipo de acto es {tramite.tipo}. ¿Deseas que redacte el borrador inicial?"}
    except Exception as e:
        logger.error(f"Error en portal greeting: {e}")
        return {"mensaje": "Hola! ¿En qué podemos avanzar con este trámite?"}

@router.get("/participaciones/{tramite_id}")
async def obtener_participaciones_portal(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """
    Endpoint ultra-estable para participaciones.
    """
    stmt = (
        select(Participacion, Cliente.nombre_completo, Cliente.dni)
        .join(Cliente, Participacion.cliente_id == Cliente.id)
        .where(Participacion.tramite_id == tramite_id)
    )
    
    result = await db.execute(stmt)
    clientes = []
    
    for row in result.all():
        p, nombre, dni = row
        clientes.append({
            "id": p.id,
            "nombre": nombre,
            "dni_cuit": dni,
            "rol": p.rol
        })
        
    return {"clientes": clientes}
