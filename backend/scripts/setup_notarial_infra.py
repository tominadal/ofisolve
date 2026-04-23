import asyncio
import os
import shutil
from sqlalchemy import select
from app.core.database import engine, AsyncSessionLocal
from app.models.db_models import Base, Workspace, Cliente, Tramite, Participacion, DocumentoLibreria
from loguru import logger

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
CLIENTES_DIR = os.path.join(UPLOADS_DIR, "clientes")

async def setup_infra():
    logger.info("🚀 Iniciando configuración de infraestructura notarial robusta...")
    
    # Crear tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Tablas de base de datos creadas/verificadas.")

    # Asegurar directorios base
    os.makedirs(CLIENTES_DIR, exist_ok=True)

    async with AsyncSessionLocal() as db:
        # 1. Obtener o crear Workspaces base
        res_ws_fam = await db.execute(select(Workspace).where(Workspace.nombre == "Tramites Familiares"))
        ws_familia = res_ws_fam.scalars().first()
        if not ws_familia:
            ws_familia = Workspace(nombre="Tramites Familiares", descripcion="Sucesiones, Poderes y Actas familiares")
            db.add(ws_familia)
            await db.commit()
            await db.refresh(ws_familia)
            logger.info("✅ Workspace 'Tramites Familiares' creado.")

        res_ws_soc = await db.execute(select(Workspace).where(Workspace.nombre == "Sociedades"))
        ws_soc = res_ws_soc.scalars().first()
        if not ws_soc:
            ws_soc = Workspace(nombre="Sociedades", descripcion="Constituciones, Actas y Contratos societarios")
            db.add(ws_soc)
            await db.commit()
            await db.refresh(ws_soc)
            logger.info("✅ Workspace 'Sociedades' creado.")

        # 2. Definición de Clientes y Documentos para inyección robusta
        data_clientes = [
            {
                "nombre": "Roberto Goldi",
                "dni": "12.345.678",
                "email": "roberto.goldi@gmail.com",
                "domicilio": "Av. Santa Fe 1234, CABA",
                "ws_id": ws_familia.id,
                "tramites": [
                    {
                        "nombre": "Sucesión Ab-Intestato Goldi",
                        "tipo": "Sucesion",
                        "archivos": ["DNI_Roberto.pdf", "Partida_Nacimiento.pdf", "Titulo_Propiedad.docx"]
                    }
                ]
            },
            {
                "nombre": "Maria Elena Walsh",
                "dni": "3.444.555",
                "email": "legales@walsh-foundation.org",
                "domicilio": "Calle del Sol 456, CABA",
                "ws_id": ws_familia.id,
                "tramites": [
                    {
                        "nombre": "Poder Derechos de Autor",
                        "tipo": "Poder",
                        "archivos": ["Estatuto_Fundacion.pdf", "Acta_Designacion.pdf", "Obra_Catalogo.xlsx"]
                    }
                ]
            },
            {
                "nombre": "Constructora Horizonte S.A.",
                "dni": "30-71458963-9",
                "email": "administracion@horizonte-sa.com.ar",
                "domicilio": "Torre Madero 10. Piso 4, CABA",
                "ws_id": ws_soc.id,
                "tramites": [
                    {
                        "nombre": "Escritura Hipoteca San Telmo",
                        "tipo": "Escritura",
                        "archivos": ["Plano_Mensura.pdf", "Certificado_Dominio.pdf", "Borrador_Hipoteca.docx"]
                    }
                ]
            }
        ]

        for c_data in data_clientes:
            # Buscar o crear cliente
            res_c = await db.execute(select(Cliente).where(Cliente.nombre_completo == c_data["nombre"]))
            cliente = res_c.scalars().first()
            if not cliente:
                cliente = Cliente(
                    nombre_completo=c_data["nombre"],
                    dni=c_data["dni"],
                    email=c_data["email"],
                    domicilio=c_data["domicilio"],
                    workspace_id=c_data["ws_id"]
                )
                db.add(cliente)
                await db.commit()
                await db.refresh(cliente)
                logger.info(f"✅ Cliente '{cliente.nombre_completo}' creado.")
            
            # Crear carpeta real del cliente
            c_path = os.path.join(CLIENTES_DIR, f"cliente_{cliente.id}")
            os.makedirs(c_path, exist_ok=True)

            for t_data in c_data["tramites"]:
                # Buscar o crear trámite
                res_t = await db.execute(select(Tramite).where(Tramite.nombre == t_data["nombre"]))
                tramite = res_t.scalars().first()
                if not tramite:
                    tramite = Tramite(
                        workspace_id=c_data["ws_id"],
                        nombre=t_data["nombre"],
                        tipo=t_data["tipo"],
                        estado="abierto",
                        descripcion=f"Trámite de {t_data['tipo']} para {cliente.nombre_completo}"
                    )
                    db.add(tramite)
                    await db.commit()
                    await db.refresh(tramite)
                    
                    # Crear participación
                    participacion = Participacion(tramite_id=tramite.id, cliente_id=cliente.id, rol="Titular")
                    db.add(participacion)
                    await db.commit()
                    logger.info(f"   📂 Trámite '{tramite.nombre}' creado.")

                # Crear carpeta real del trámite
                t_path = os.path.join(c_path, f"tramite_{tramite.id}")
                os.makedirs(t_path, exist_ok=True)

                for f_name in t_data["archivos"]:
                    f_path = os.path.join(t_path, f_name)
                    if not os.path.exists(f_path):
                        with open(f_path, "w", encoding="utf-8") as f:
                            f.write(f"Contenido ficticio para {f_name}\nRelacionado con {tramite.nombre}")
                        logger.debug(f"      📄 Archivo '{f_name}' creado en disco.")

                    # Registrar en DB si no existe
                    res_doc = await db.execute(select(DocumentoLibreria).where(DocumentoLibreria.path == f_path))
                    if not res_doc.scalars().first():
                        doc = DocumentoLibreria(
                            workspace_id=c_data["ws_id"],
                            cliente_id=cliente.id,
                            tramite_id=tramite.id,
                            nombre=f_name,
                            tipo=f_name.split(".")[-1],
                            path=f_path
                        )
                        db.add(doc)
                        await db.commit()
                        logger.debug(f"      💾 Archivo '{f_name}' registrado en BD.")

    logger.success("🏁 Infraestructura notarial configurada correctamente.")

if __name__ == "__main__":
    asyncio.run(setup_infra())
