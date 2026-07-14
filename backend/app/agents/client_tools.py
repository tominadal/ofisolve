import json
from langchain_core.tools import tool
from loguru import logger
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.db_models import Cliente

@tool
async def buscar_clientes(query: str) -> str:
    """
    Busca clientes en la base de datos por nombre o DNI/CUIT.
    Utiliza esto cuando el usuario te pregunte por la lista de clientes o por un cliente en específico.
    El parámetro query puede ser el nombre, DNI, o vacío para traer los últimos 20 clientes.
    """
    logger.info(f"[Tool] Buscando clientes con query: {query}")
    async with AsyncSessionLocal() as db:
        stmt = select(Cliente)
        if query and query.strip():
            stmt = stmt.where(
                (Cliente.nombre_completo.ilike(f"%{query}%")) |
                (Cliente.dni.ilike(f"%{query}%")) |
                (Cliente.cuit.ilike(f"%{query}%"))
            )
        stmt = stmt.limit(20)
        res = await db.execute(stmt)
        clientes = res.scalars().all()
        
        if not clientes:
            return "No se encontraron clientes."
            
        resultados = []
        for c in clientes:
            resultados.append(f"ID: {c.id} | Nombre: {c.nombre_completo} | DNI: {c.dni} | CUIT: {c.cuit} | Tipo: {c.tipo_persona}")
            
        return "\n".join(resultados)

@tool
async def obtener_perfil_cliente(cliente_id: int) -> str:
    """
    Obtiene todos los datos detallados de un cliente específico por su ID.
    Usa esta herramienta cuando necesites ver todos los datos (domicilio, nacimiento, UIF, PEP, etc) de un cliente.
    """
    logger.info(f"[Tool] Obteniendo perfil completo del cliente ID: {cliente_id}")
    async with AsyncSessionLocal() as db:
        stmt = select(Cliente).where(Cliente.id == cliente_id)
        res = await db.execute(stmt)
        cliente = res.scalars().first()
        
        if not cliente:
            return f"Error: Cliente con ID {cliente_id} no encontrado."
            
        cli_dict = cliente.__dict__
        cli_info = [f"{k}: {v}" for k, v in cli_dict.items() if k not in ["_sa_instance_state", "workspace_id", "fecha_creacion"] and v is not None]
        
        return "PERFIL DEL CLIENTE:\n" + "\n".join(cli_info)

@tool
async def actualizar_cliente(cliente_id: int, campo: str, nuevo_valor: str) -> str:
    """
    Actualiza un campo específico de un cliente en la base de datos.
    Los campos válidos son: nombre_completo, dni, cuit, email, telefono, domicilio, tipo_persona, sexo, variante_nombre, nacionalidad, tipo_documento, ejemplar_documento, estado_familia, nombre_padre, nombre_madre, domicilio_calle, domicilio_numero, domicilio_piso, domicilio_depto, domicilio_barrio, domicilio_localidad, domicilio_provincia, domicilio_pais, condicion_iva, riesgo_uif, es_pep.
    Usa esta herramienta SOLO cuando el usuario te pida EXPLÍCITAMENTE editar, actualizar o corregir un dato del cliente.
    """
    logger.info(f"[Tool] Actualizando cliente ID: {cliente_id}, campo: {campo} -> ***(PII Redacted)***")
    # Validate campo
    campos_permitidos = ["nombre_completo", "dni", "cuit", "email", "telefono", "domicilio", "tipo_persona", 
                         "sexo", "variante_nombre", "nacionalidad", "tipo_documento", "ejemplar_documento", 
                         "estado_familia", "nombre_padre", "nombre_madre", "domicilio_calle", "domicilio_numero", 
                         "domicilio_piso", "domicilio_depto", "domicilio_barrio", "domicilio_localidad", 
                         "domicilio_provincia", "domicilio_pais", "condicion_iva", "riesgo_uif"]
    
    # Manejar booleanos
    valor_final = nuevo_valor
    if campo == "es_pep":
        valor_final = True if nuevo_valor.lower() in ['true', 'si', 'sí', '1'] else False
        campos_permitidos.append("es_pep")
        
    if campo not in campos_permitidos:
        return f"Error: El campo '{campo}' no es válido o no está permitido editarlo."
        
    async with AsyncSessionLocal() as db:
        stmt = update(Cliente).where(Cliente.id == cliente_id).values({campo: valor_final})
        await db.execute(stmt)
        await db.commit()
        return f"¡Éxito! El campo '{campo}' del cliente {cliente_id} fue actualizado a '{nuevo_valor}' en la base de datos."

client_tools = [buscar_clientes, obtener_perfil_cliente, actualizar_cliente]
