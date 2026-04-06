from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
import datetime

from app.models import db_models as models

async def seed_data(db: AsyncSession):
    """
    Seeding Inicial de Datos (Asíncrono).
    Crea un workspace, clientes y equipo base si la DB está vacía.
    """
    result = await db.execute(select(models.Workspace).limit(1))
    if not result.scalars().first():
        logger.info("[Seed] Base de datos vacía. Creando datos iniciales...")
        
        # 1. Crear Workspace
        ws = models.Workspace(
            nombre="Escribania Central - Buenos Aires", 
            descripcion="Sede principal de gestión notarial"
        )
        db.add(ws)
        await db.commit()
        await db.refresh(ws)
        
        # 2. Crear Clientes base
        clientes = [
            models.Cliente(
                workspace_id=ws.id, 
                nombre_completo="Juan Carlos Pérez", 
                dni="20345678", 
                email="juan.perez@email.com", 
                domicilio="Av. Rivadavia 1500, CABA"
            ),
            models.Cliente(
                workspace_id=ws.id, 
                nombre_completo="María Elena García", 
                dni="27890123", 
                email="m.garcia@email.com", 
                domicilio="Pueyrredón 450, 4to B, CABA"
            ),
            models.Cliente(
                workspace_id=ws.id, 
                nombre_completo="Roberto Carlos Gómez", 
                dni="22123456", 
                email="rcgomez@empresa.com.ar", 
                domicilio="Florida 10, CABA"
            )
        ]
        db.add_all(clientes)
        
        # 3. Crear Equipo base
        equipo = [
            models.EquipoMiembro(workspace_id=ws.id, nombre="Escribano Titular", rol="Titular", email="titular@ofisolve.com"),
            models.EquipoMiembro(workspace_id=ws.id, nombre="Abogado Adscripto", rol="Adscripto", email="adscripto@ofisolve.com"),
            models.EquipoMiembro(workspace_id=ws.id, nombre="Socia Administrativa", rol="Administración", email="admin@ofisolve.com")
        ]
        db.add_all(equipo)
        
        await db.commit()
        logger.info("[Seed] Datos iniciales creados con éxito.")
    else:
        logger.info("[Seed] La base de datos ya contiene información. Omitiendo seed.")
