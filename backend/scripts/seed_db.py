import asyncio
import sys
import os
import shutil
import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.db_models import Workspace, Cliente, Tramite, EquipoMiembro, Usuario, DocumentoLibreria
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Configuración de rutas para persistencia física
BASE_DIR = Path(__file__).parent.parent.parent
UPLOADS_DIR = BASE_DIR / "backend" / "uploads" / "clientes"

async def seed():
    print("Iniciando Seed Maestro (SQL + FS)...")
    
    # Crear tablas si no existen
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        # ============================================================
        # 1. USUARIO DE PRUEBA
        # ============================================================
        existing_user = await db.execute(
            select(Usuario).filter(Usuario.email == "escribano@ofisolve.com")
        )
        user = existing_user.scalars().first()
        if not user:
            user = Usuario(
                email="escribano@ofisolve.com",
                hashed_password=pwd_context.hash("admin123"),
                nombre_completo="Dr. Martín Escribano",
                rol="Escribano",
                is_active=True,
                is_superuser=True
            )
            db.add(user)
            await db.flush()
            print(f"User creado: escribano@ofisolve.com / admin123")
        else:
            print(f"User ya existe: {user.email}")

        # ============================================================
        # 2. WORKSPACE
        # ============================================================
        existing_ws = await db.execute(select(Workspace))
        ws = existing_ws.scalars().first()
        if not ws:
            ws = Workspace(
                nombre="Escribanía Notarial CABA",
                descripcion="Jurisdicción Ciudad Autónoma de Buenos Aires"
            )
            db.add(ws)
            await db.flush()
            print(f"Workspace creado: {ws.nombre} (ID: {ws.id})")
        else:
            print(f"Workspace ya existe: {ws.nombre} (ID: {ws.id})")

        ws_id = ws.id

        # ============================================================
        # 3. CLIENTES PREMIUM
        # ============================================================
        existing_clients = await db.execute(
            select(Cliente).filter(Cliente.workspace_id == ws_id)
        )
        if not existing_clients.scalars().first():
            clientes_data = [
                {
                    "id": 1,
                    "nombre_completo": "Roberto Carlos Goldi",
                    "dni": "25987654",
                    "cuit": "20-25987654-3",
                    "email": "rgoldi@empresas.com.ar",
                    "telefono": "+54 11 4567-8901",
                    "domicilio": "Av. Libertador 1200, CABA",
                    "tipo_persona": "Fisica"
                },
                {
                    "id": 2,
                    "nombre_completo": "María Elena Walsh",
                    "dni": "30456789",
                    "cuit": "27-30456789-4",
                    "email": "mewalsh@notarial.com.ar",
                    "telefono": "+54 11 5678-1234",
                    "domicilio": "Callao 890 Piso 4, CABA",
                    "tipo_persona": "Fisica"
                },
                {
                    "id": 3,
                    "nombre_completo": "Constructora Horizonte S.A.",
                    "dni": "30712345678",
                    "cuit": "30-71234567-8",
                    "email": "legales@horizontesa.com.ar",
                    "telefono": "+54 11 6789-0123",
                    "domicilio": "Av. Corrientes 3456 Of. 12, CABA",
                    "tipo_persona": "Juridica"
                },
            ]
            
            for cd in clientes_data:
                cliente = Cliente(workspace_id=ws_id, **cd)
                db.add(cliente)
            
            await db.flush()
            print(f"3 clientes premium creados en workspace {ws_id}")
        else:
            print(f"Clientes ya existen en workspace {ws_id}")

        # ============================================================
        # 4. TRÁMITES Y LIBRERÍA FÍSICA
        # ============================================================
        existing_tram = await db.execute(
            select(Tramite).filter(Tramite.workspace_id == ws_id)
        )
        if not existing_tram.scalars().first():
            tramites_data = [
                {"id": 1, "cliente_id": 1, "nombre": "Compraventa Inmueble - Goldi", "tipo": "escritura", "estado": "en_progreso", "docs": ["DNI_Goldi.pdf", "Titulo_Propiedad.pdf"]},
                {"id": 2, "cliente_id": 2, "nombre": "Certificación de Firmas - Walsh", "tipo": "certificacion", "estado": "borrador", "docs": ["Minuta_Firma.docx"]},
                {"id": 3, "cliente_id": 3, "nombre": "Poder General - Horizonte S.A.", "tipo": "poder", "estado": "borrador", "docs": ["Estatuto_Socio.pdf", "Acta_Directorio.txt"]},
                {"id": 4, "cliente_id": 1, "nombre": "Autorización de Viaje - Goldi Jr", "tipo": "acta", "estado": "en_progreso", "docs": ["Partida_Nacimiento.pdf"]},
            ]
            
            # Limpiar uploads para recrear
            if UPLOADS_DIR.exists():
                shutil.rmtree(UPLOADS_DIR)
            os.makedirs(UPLOADS_DIR, exist_ok=True)

            for td in tramites_data:
                c_id = td.pop("cliente_id")
                docs = td.pop("docs")
                t_id = td["id"]
                
                tramite = Tramite(workspace_id=ws_id, **td)
                db.add(tramite)
                await db.flush()

                # Crear carpetas físicas
                t_path = UPLOADS_DIR / str(c_id) / str(t_id)
                os.makedirs(t_path, exist_ok=True)

                for doc_name in docs:
                    f_path = t_path / doc_name
                    with open(f_path, "w", encoding="utf-8") as f:
                        f.write(f"CONTENIDO NOTARIAL - {doc_name}\nCliente ID: {c_id}\nTrámite: {td['nombre']}\n\n-- SOBERANÍA DE DATOS OFISOLVE --")
                    
                    # Registrar en DB
                    doc_lib = DocumentoLibreria(
                        workspace_id=ws_id,
                        cliente_id=c_id,
                        tramite_id=t_id,
                        nombre=doc_name,
                        tipo=doc_name.split(".")[-1],
                        path=str(f_path.relative_to(BASE_DIR))
                    )
                    db.add(doc_lib)
            
            await db.flush()
            print(f"4 tramites y estructura de archivos fisicos creados")
        else:
            print(f"Tramites ya existen")

        # ============================================================
        # 5. EQUIPO
        # ============================================================
        existing_equipo = await db.execute(
            select(EquipoMiembro).filter(EquipoMiembro.workspace_id == ws_id)
        )
        if not existing_equipo.scalars().first():
            equipo_data = [
                {"nombre": "Dr. Martín Escribano", "rol": "Escribano Titular", "email": "escribano@ofisolve.com"},
                {"nombre": "Lic. Ana Rodríguez", "rol": "Asistente Notarial", "email": "arodriguez@ofisolve.com"},
            ]
            for ed in equipo_data:
                miembro = EquipoMiembro(workspace_id=ws_id, **ed)
                db.add(miembro)
            await db.flush()
            print(f"2 miembros de equipo creados")
        else:
            print(f"Equipo ya existe")

        await db.commit()
        print("\nSEED MAESTRO COMPLETADO.")
        print(f"   Base de Datos: backend/ofisolve.db")
        print(f"   Archivos Físicos: backend/uploads/clientes/")
        print(f"   Acceso: escribano@ofisolve.com / admin123")

if __name__ == "__main__":
    asyncio.run(seed())
