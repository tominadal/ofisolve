from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.db_models import Cliente, Tramite, Participacion
from app.core.config import get_settings
from loguru import logger
import datetime

# ============================================================
# Esquemas Pydantic para Structured Output
# ============================================================

class PersonaExtraida(BaseModel):
    nombre: str = Field(description="Nombre completo de la persona")
    dni: str = Field(description="DNI de la persona sin puntos (8 números)")
    cuit: Optional[str] = Field(description="CUIT de la persona (11 números)")
    rol: str = Field(description="Rol en el trámite (ej: Requirente, Comprador, Vendedor, Cedente)")
    tipo_persona: str = Field(description="Tipo de persona: 'Fisica' o 'Juridica'")

class DatosTramiteExtraidos(BaseModel):
    tipo: str = Field(description="Tipo de acto notarial resumido (ej: Certificación de Firma)")
    personas: List[PersonaExtraida] = Field(description="Lista de personas que intervienen en el documento")

# ============================================================
# Servicio de Extracción
# ============================================================

async def extraer_y_guardar_entidades(texto_contexto: str, db_session: AsyncSession) -> dict:
    """
    Usa el LLM para extraer entidades del texto y las persiste en la base de datos.
    Implementa lógica de Upsert para clientes.
    """
    settings = get_settings()
    
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        # 1. Configurar el LLM con Structured Output
        llm = ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.google_api_key,
            temperature=0
        )
        
        structured_llm = llm.with_structured_output(DatosTramiteExtraidos)
        
        prompt = f"""
        Analiza el siguiente texto de un documento notarial y extrae la información estructurada.
        Asegúrate de limpiar los DNI/CUIT dejando solo números.
        
        TEXTO DEL DOCUMENTO:
        {texto_contexto}
        """
        
        logger.info("Iniciando extracción de entidades con LLM...")
        datos_extraidos: DatosTramiteExtraidos = await structured_llm.ainvoke(prompt)
        
        if not datos_extraidos:
            logger.warning("El LLM no devolvió datos estructurados.")
            return {}

        # 2. Persistir en Base de Datos
        
        # Crear el Trámite
        # Nota: workspace_id debería venir del contexto, para el MVP usamos None o el primero
        nuevo_tramite = Tramite(
            workspace_id=1, # Default workspace del seed
            nombre=datos_extraidos.tipo,
            tipo=datos_extraidos.tipo,
            fecha_creacion=datetime.datetime.utcnow(),
            estado="Procesado"
        )
        db_session.add(nuevo_tramite)
        await db_session.flush() # Para obtener el ID del trámite
        
        clientes_procesados = []
        
        for p in datos_extraidos.personas:
            # Lógica de Upsert para Cliente
            stmt = select(Cliente).where(Cliente.dni == p.dni)
            result = await db_session.execute(stmt)
            cliente_existente = result.scalars().first()
            
            if cliente_existente:
                # Actualizar si es necesario
                cliente_existente.nombre_completo = p.nombre
                cliente_existente.tipo_persona = p.tipo_persona
                cliente = cliente_existente
            else:
                # Crear nuevo
                cliente = Cliente(
                    workspace_id=1, # Default workspace del seed
                    nombre_completo=p.nombre,
                    dni=p.dni,
                    cuit=p.cuit,
                    tipo_persona=p.tipo_persona
                )
                db_session.add(cliente)
                await db_session.flush()
            
            # Crear Participación
            nueva_participacion = Participacion(
                cliente_id=cliente.id,
                tramite_id=nuevo_tramite.id,
                rol=p.rol
            )
            db_session.add(nueva_participacion)
            
            clientes_procesados.append({
                "nombre": cliente.nombre_completo,
                "dni": cliente.dni,
                "rol": p.rol
            })
            
        await db_session.commit()
        
        logger.info(f"Trámite {nuevo_tramite.id} guardado con {len(clientes_procesados)} participaciones.")
        
        return {
            "tramite_id": nuevo_tramite.id,
            "tipo": nuevo_tramite.tipo,
            "clientes": clientes_procesados
        }

    except Exception as e:
        logger.error(f"Error en extracción y guardado: {str(e)}")
        await db_session.rollback()
        return {"error": str(e)}
