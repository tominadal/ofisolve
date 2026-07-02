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
from app.rag.rag_service import RAGService
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Configuración de rutas para persistencia física
BASE_DIR = Path(__file__).parent.parent.parent
UPLOADS_DIR = BASE_DIR / "backend" / "uploads" / "clientes"

async def seed():
    print("Iniciando Seed Maestro (SQL + FS)...")
    
    # Crear tablas (reiniciar si existen)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as db:
        # 1. USUARIO DE PRUEBA
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
        
        # 2. WORKSPACE
        ws = Workspace(
            nombre="Escribanía Notarial CABA",
            descripcion="Jurisdicción Ciudad Autónoma de Buenos Aires"
        )
        db.add(ws)
        await db.flush()
        ws_id = ws.id

        # 3. CLIENTES PREMIUM (Aumentado)
        clientes_data = [
            {"id": 1, "nombre_completo": "Roberto Carlos Goldi", "dni": "25987654", "cuit": "20-25987654-3", "email": "rgoldi@empresas.com.ar", "telefono": "+54 11 4567-8901", "domicilio": "Av. Libertador 1200, CABA", "tipo_persona": "Fisica"},
            {"id": 2, "nombre_completo": "María Elena Walsh", "dni": "30456789", "cuit": "27-30456789-4", "email": "mewalsh@notarial.com.ar", "telefono": "+54 11 5678-1234", "domicilio": "Callao 890 Piso 4, CABA", "tipo_persona": "Fisica"},
            {"id": 3, "nombre_completo": "Constructora Horizonte S.A.", "dni": "30712345678", "cuit": "30-71234567-8", "email": "legales@horizontesa.com.ar", "telefono": "+54 11 6789-0123", "domicilio": "Av. Corrientes 3456 Of. 12, CABA", "tipo_persona": "Juridica"},
            {"id": 4, "nombre_completo": "Inversiones Globales LLC", "dni": "40987654321", "cuit": "30-98765432-1", "email": "contact@invglobal.com", "telefono": "+1 305 555-1234", "domicilio": "Brickell Ave 1000, Miami, USA", "tipo_persona": "Juridica"},
            {"id": 5, "nombre_completo": "Fundación Vida Silvestre", "dni": "30555555555", "cuit": "30-55555555-5", "email": "info@vidasilvestre.org.ar", "telefono": "+54 11 4331-3631", "domicilio": "Defensa 251, CABA", "tipo_persona": "Juridica"},
        ]
        
        for cd in clientes_data:
            cliente = Cliente(workspace_id=ws_id, **cd)
            db.add(cliente)
        await db.flush()

        # 4. TRÁMITES Y LIBRERÍA FÍSICA (Ampliados)
        tramites_data = [
            {"id": 1, "cliente_id": 1, "nombre": "Compraventa Inmueble - Goldi", "tipo": "escritura", "estado": "en_progreso", "docs": ["DNI_Goldi.pdf", "Titulo_Propiedad.pdf", "Boleto_Compraventa.txt", "Informe_Dominio.txt"]},
            {"id": 2, "cliente_id": 2, "nombre": "Certificación de Firmas - Walsh", "tipo": "certificacion", "estado": "borrador", "docs": ["Minuta_Firma.docx", "Documento_Identidad.pdf"]},
            {"id": 3, "cliente_id": 3, "nombre": "Poder General - Horizonte S.A.", "tipo": "poder", "estado": "borrador", "docs": ["Estatuto_Socio.pdf", "Acta_Directorio_Asamblea.txt", "Nomina_Directores.pdf", "Balance_2025.txt"]},
            {"id": 4, "cliente_id": 1, "nombre": "Autorización de Viaje - Goldi Jr", "tipo": "acta", "estado": "en_progreso", "docs": ["Partida_Nacimiento.pdf", "Consentimiento_Madre.txt"]},
            {"id": 5, "cliente_id": 4, "nombre": "Constitución Sucursal Extranjera", "tipo": "escritura", "estado": "en_progreso", "docs": ["Apostilla_Estatuto.txt", "Poder_Representante_Legal.pdf", "Resolucion_Directorio_Matriz.txt"]},
            {"id": 6, "cliente_id": 5, "nombre": "Donación con Cargo", "tipo": "escritura", "estado": "borrador", "docs": ["Resolucion_Aceptacion_Donacion.txt", "Estatuto_Fundacion.pdf", "Plano_Inmueble_Donado.pdf"]},
        ]
        
        if UPLOADS_DIR.exists():
            shutil.rmtree(UPLOADS_DIR)
        os.makedirs(UPLOADS_DIR, exist_ok=True)

        rag = RAGService()
        
        # Textos súper largos simulados
        TEXTO_COMPRAVENTA = """ESCRITURA PÚBLICA DE COMPRAVENTA DE INMUEBLE
NÚMERO CIENTO VEINTE (120)
En la Ciudad Autónoma de Buenos Aires, a los 15 días del mes de mayo de 2026.
COMPARECEN:
Por una parte, en su carácter de parte VENDEDORA: Juan Pérez, titular del DNI 10.000.000.
Y por la otra, el COMPRADOR, quien manifiesta su voluntad de adquirir...

TÍTULOS: El inmueble fue adquirido por el VENDEDOR según escritura número...
CONDICIONES: La presente compraventa se realiza por el monto total de USD 200.000...
""" * 50

        TEXTO_ACTA = """ACTA DE ASAMBLEA GENERAL ORDINARIA Y EXTRAORDINARIA
En la Ciudad Autónoma de Buenos Aires, siendo las 10:00 hs del día 15 de marzo de 2026, se reúnen en la sede social los accionistas...
El orden del día consta de los siguientes puntos:
1. Consideración de la memoria y balance...
2. Aprobación de la gestión del directorio...
3. Destino de los resultados...

Tras deliberar, los accionistas aprueban por unanimidad la moción presentada por el señor presidente.
""" * 40

        TEXTO_ESTATUTO = """ESTATUTO SOCIAL
TÍTULO I: DENOMINACIÓN, JURISDICCIÓN, DOMICILIO, PLAZO Y OBJETO
ARTÍCULO 1º: Bajo la denominación respectiva se constituye una sociedad que se regirá por la Ley de Sociedades Comerciales...
ARTÍCULO 2º: El domicilio legal de la sociedad se fija en la Ciudad Autónoma de Buenos Aires...
ARTÍCULO 3º: OBJETO: La sociedad tendrá por objeto realizar por cuenta propia o de terceros...
""" * 30

        TEXTO_INFORME = """INFORME DE DOMINIO - REGISTRO DE LA PROPIEDAD INMUEBLE
Matrícula: 12-34567/8
Titular: Juan Pérez
Proporción: 100%
Gravámenes:
- Hipoteca en Primer Grado a favor de Banco Galicia por USD 50.000...
- Embargo trabado en los autos caratulados "GOMEZ C/ PEREZ S/ EJECUTIVO"...
""" * 20

        for td in tramites_data:
            c_id = td.pop("cliente_id")
            docs = td.pop("docs")
            t_id = td["id"]
            
            tramite = Tramite(workspace_id=ws_id, cliente_id=c_id, **td)
            db.add(tramite)
            await db.flush()

            t_path = UPLOADS_DIR / str(c_id) / str(t_id)
            os.makedirs(t_path, exist_ok=True)

            for doc_name in docs:
                f_path = t_path / doc_name
                
                texto_mock = f"DOCUMENTO: {doc_name}\nCLIENTE: {c_id}\n\n"
                if "Compraventa" in td['nombre'] or "Dominio" in doc_name or "Boleto" in doc_name:
                    texto_mock += TEXTO_COMPRAVENTA
                elif "Acta" in doc_name or "Resolucion" in doc_name or "Poder" in doc_name or "Minuta" in doc_name:
                    texto_mock += TEXTO_ACTA
                elif "Estatuto" in doc_name or "Matriz" in doc_name:
                    texto_mock += TEXTO_ESTATUTO
                else:
                    texto_mock += TEXTO_INFORME
                    
                with open(f_path, "w", encoding="utf-8") as f:
                    f.write(texto_mock)
                
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
                
                try:
                    rag.indexar_documento_tramite(
                        tramite_id=t_id,
                        doc_id=doc_lib.id,
                        contenido_bytes=texto_mock.encode("utf-8"),
                        nombre=doc_name
                    )
                except Exception as e:
                    pass
        
        # 5. EQUIPO
        equipo_data = [
            {"nombre": "Dr. Martín Escribano", "rol": "Escribano Titular", "email": "escribano@ofisolve.com"},
            {"nombre": "Lic. Ana Rodríguez", "rol": "Asistente Notarial", "email": "arodriguez@ofisolve.com"},
        ]
        for ed in equipo_data:
            db.add(EquipoMiembro(workspace_id=ws_id, **ed))
            
        await db.commit()
        print("SEED COMPLETADO CON MOCKS EXTENSOS.")

if __name__ == "__main__":
    asyncio.run(seed())
