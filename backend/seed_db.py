import asyncio
import datetime
from sqlalchemy import select
from app.core.database import engine, get_db
from app.models.db_models import Base, Usuario, Workspace, Tramite, Cliente, EquipoMiembro
from app.core.security import get_password_hash

async def seed():
    print("Iniciando semilla de base de datos OfiSolve...")
    async with engine.begin() as conn:
        # Crea las tablas si no existen
        await conn.run_sync(Base.metadata.create_all)

    async for db in get_db():
        # 1. Crear Usuario de Prueba (Dr. Martin Rodriguez)
        result = await db.execute(select(Usuario).filter(Usuario.email == "martin.rodriguez@escribania.com.ar"))
        user = result.scalars().first()
        
        if not user:
            print("Creando usuario: Dr. Martin Rodriguez...")
            user = Usuario(
                email="martin.rodriguez@escribania.com.ar",
                hashed_password=get_password_hash("admin123"),
                nombre_completo="Dr. Martin Rodriguez",
                rol="Escribano",
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # 2. Crear Workspaces Replicando Mocks
        ws_names = ["Tramites Familiares", "Inmuebles CABA", "Sociedades"]
        workspaces = {}
        
        for name in ws_names:
            result = await db.execute(select(Workspace).filter(Workspace.nombre == name))
            ws = result.scalars().first()
            if not ws:
                print(f"Creando workspace: {name}...")
                ws = Workspace(
                    nombre=name,
                    descripcion=f"Gestión de expedientes de {name.lower()}",
                    fecha_creacion=datetime.datetime.utcnow()
                )
                db.add(ws)
                await db.commit()
                await db.refresh(ws)
            workspaces[name] = ws

        # 3. Crear Clientes de Prueba
        ws_familiares = workspaces["Tramites Familiares"]
        result = await db.execute(select(Cliente).filter(Cliente.dni == "35123456"))
        cliente_juan = result.scalars().first()
        if not cliente_juan:
            print("Creando cliente: Juan Pérez...")
            cliente_juan = Cliente(
                workspace_id=ws_familiares.id,
                nombre_completo="Juan Carlos Pérez",
                dni="35123456",
                email="juan.perez@email.com",
                domicilio="Av. Corrientes 1234, CABA"
            )
            db.add(cliente_juan)
            
        result = await db.execute(select(Cliente).filter(Cliente.dni == "40987654"))
        cliente_maria = result.scalars().first()
        if not cliente_maria:
            print("Creando cliente: María García...")
            cliente_maria = Cliente(
                workspace_id=ws_familiares.id,
                nombre_completo="María Luz García",
                dni="40987654",
                email="maria.garcia@email.com"
            )
            db.add(cliente_maria)
        
        await db.commit()

        # 4. Crear Trámites de Prueba
        result = await db.execute(select(Tramite).filter(Tramite.workspace_id == ws_familiares.id))
        if not result.scalars().first():
            print("Creando trámites iniciales...")
            tramites = [
                Tramite(
                    workspace_id=ws_familiares.id,
                    nombre="Certificación de Firmas - Juan Pérez",
                    tipo="Certificacion",
                    estado="en_progreso"
                ),
                Tramite(
                    workspace_id=ws_familiares.id,
                    nombre="Poder Especial para Venta - Maria Garcia",
                    tipo="Poder",
                    estado="borrador"
                ),
                Tramite(
                    workspace_id=ws_familiares.id,
                    nombre="Autorización Viaje Menor - Familia Lopez",
                    tipo="Certificacion",
                    estado="completado"
                )
            ]
            db.add_all(tramites)
            await db.commit()

        print("¡Base de datos sembrada con éxito!")
        break

if __name__ == "__main__":
    asyncio.run(seed())
