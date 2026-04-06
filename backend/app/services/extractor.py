from typing import List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.database import ClienteSaaS, TramiteSaaS, ParticipacionSaaS
from app.core.config import get_settings
from loguru import logger
import datetime

# ============================================================
# Esquemas Pydantic para Structured Output (ERP Notarial)
# ============================================================

class EntidadPersona(BaseModel):
    nombre: str = Field(description="Nombre completo de la persona (natural o jurídica)")
    dni_cuit: str = Field(description="DNI o CUIT sin puntos ni guiones")
    rol: str = Field(description="Rol en el trámite (ej: Comprador, Vendedor, Requirente, Autorizante)")
    tipo_persona: str = Field(description="'Fisica' o 'Juridica'", default="Fisica")

class ExtraccionNotarial(BaseModel):
    tipo_acto: str = Field(description="Resumen corto del tipo de acto (ej: Venta, Poder, Certificación)")
    entidades: List[EntidadPersona] = Field(description="Lista de personas y sus roles extraídos del texto")

# ============================================================
# Agente Extractor (Data Entry Cero)
# ============================================================

class ExtractorService:
    """
    Agente experto en extracción de entidades para automatización de Data Entry SaaS.
    Usa Gemini 2.0 Flash para convertir texto desordenado en registros estructurados.
    """

    def __init__(self):
        settings = get_settings()
        from langchain_google_genai import ChatGoogleGenerativeAI
        
        self.llm = ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.google_api_key,
            temperature=0
        )
        # Configurar Structured Output
        self.extractor = self.llm.with_structured_output(ExtraccionNotarial)

    async def procesar_y_persistir(self, texto: str, db: AsyncSession, workspace_id: int) -> dict:
        """
        Analiza el texto, extrae entidades y realiza el Upsert en la base de datos SaaS.
        """
        logger.info(f"[Agente Extractor] Iniciando análisis para Workspace {workspace_id} (SaaS)...")
        
        try:
            # 1. Llamada al LLM con salida estructurada
            resultado_pydantic: ExtraccionNotarial = await self.extractor.ainvoke(f"Extrae los datos notariales relevantes del siguiente texto:\n\n{texto}")
            
            if not resultado_pydantic:
                logger.warning("[Agente Extractor] No se pudieron extraer entidades estructuradas.")
                return {"error": "Extracción fallida"}
                
            # Convertir a dict plano para evitar conflictos de serialización
            resultado = resultado_pydantic.model_dump()

            # 2. Persistir Trámite (ERP Foundation)
            nuevo_tramite = TramiteSaaS(
                workspace_id=workspace_id,
                tipo_acto=resultado["tipo_acto"],
                estado="Procesado",
                created_at=datetime.datetime.utcnow()
            )
            db.add(nuevo_tramite)
            await db.flush() # Para obtener ID del trámite

            datos_audit = {
                "tramite_id": nuevo_tramite.id,
                "clientes": []
            }

            # 3. Procesar Entidades (Upsert de Clientes y Participaciones)
            for persona in resultado["entidades"]:
                # Lógica de Upsert basada en DNI/CUIT y Workspace
                stmt = select(ClienteSaaS).where(
                    ClienteSaaS.dni_cuit == persona["dni_cuit"],
                    ClienteSaaS.workspace_id == workspace_id
                )
                res = await db.execute(stmt)
                cliente = res.scalars().first()

                if not cliente:
                    logger.info(f"[Agente Extractor] Creando nuevo cliente: {persona['nombre']}")
                    cliente = ClienteSaaS(
                        workspace_id=workspace_id,
                        nombre=persona["nombre"],
                        dni_cuit=persona["dni_cuit"],
                        tipo_persona=persona.get("tipo_persona", "Fisica"),
                        created_at=datetime.datetime.utcnow()
                    )
                    db.add(cliente)
                    await db.flush()
                else:
                    logger.info(f"[Agente Extractor] Cliente existente encontrado: {cliente.nombre}. Actualizando...")
                    cliente.nombre = persona["nombre"]
                
                # Crear Participación
                participacion = ParticipacionSaaS(
                    workspace_id=workspace_id,
                    cliente_id=cliente.id,
                    tramite_id=nuevo_tramite.id,
                    rol=persona["rol"]
                )
                db.add(participacion)
                
                datos_audit["clientes"].append({
                    "id": cliente.id,
                    "nombre": cliente.nombre,
                    "rol": persona["rol"]
                })

            await db.commit()
            logger.info(f"[Agente Extractor] Data Entry SaaS finalizado. Trámite ID: {nuevo_tramite.id}")
            return datos_audit

        except Exception as e:
            logger.error(f"[Agente Extractor] Error crítico en persistencia: {str(e)}")
            await db.rollback()
            return {"error": f"Error persistiendo datos: {str(e)}"}
