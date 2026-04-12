from typing import List, Optional
import datetime
import uuid
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from app.models.db_models import Cliente, Tramite, Participacion
from app.core.config import get_settings

# ============================================================
# Esquemas Pydantic para Structured Output (Data Entry IA)
# ============================================================

class PersonaExtraida(BaseModel):
    nombre: str = Field(description="Nombre completo de la persona (natural o jurídica)")
    dni_cuit: str = Field(description="DNI o CUIT sin puntos ni guiones")
    rol: str = Field(description="Rol en el trámite (ej: Comprador, Vendedor, Requirente, Autorizante)")
    tipo_persona: str = Field(description="'Fisica' o 'Juridica'", default="Fisica")

class ExtraccionNotarial(BaseModel):
    tipo_acto: str = Field(description="Resumen corto del tipo de acto (ej: Venta, Poder, Certificación)")
    personas: List[PersonaExtraida] = Field(description="Lista de personas y sus roles extraídos del texto")

# ============================================================
# Servicio de Extracción Unificado
# ============================================================

class ExtractorService:
    """
    Servicio unificado experto en extracción de entidades.
    Adaptado para Multi-Tenancy (SaaS).
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

    async def procesar_y_persistir(self, texto: str, db: AsyncSession, tenant_id: uuid.UUID) -> dict:
        """
        Analiza el texto, extrae entidades y realiza el Upsert en PostgreSQL.
        """
        logger.info(f"[ExtractorService] Analizando para Tenant {tenant_id}...")
        
        try:
            # 1. Llamada al LLM con salida estructurada
            resultado_pydantic: ExtraccionNotarial = await self.extractor.ainvoke(
                f"Analiza el siguiente documento notarial y extrae los datos relevantes:\n\n{texto}"
            )
            
            if not resultado_pydantic:
                logger.warning("[ExtractorService] No se pudieron extraer datos.")
                return {"error": "Extracción fallida"}
            
            # 2. Persistir Trámite
            nuevo_tramite = Tramite(
                tenant_id=tenant_id,
                tipo_acto=resultado_pydantic.tipo_acto,
                estado="Procesado",
                fecha_inicio=datetime.datetime.utcnow()
            )
            db.add(nuevo_tramite)
            await db.flush()

            datos_audit = {
                "tramite_id": nuevo_tramite.id,
                "tipo": nuevo_tramite.tipo_acto,
                "clientes": []
            }

            # 3. Upsert de Clientes y Participaciones
            for p in resultado_pydantic.personas:
                # Búsqueda por DNI/CUIT (limpiando entrada)
                id_limpio = "".join(filter(str.isalnum, p.dni_cuit))
                stmt = select(Cliente).where(
                    Cliente.dni_cuit == id_limpio,
                    Cliente.tenant_id == tenant_id
                )
                res = await db.execute(stmt)
                cliente = res.scalars().first()

                if not cliente:
                    logger.info(f"[ExtractorService] Nuevo cliente: {p.nombre}")
                    cliente = Cliente(
                        tenant_id=tenant_id,
                        nombre=p.nombre,
                        dni_cuit=id_limpio,
                        tipo_persona=p.tipo_persona
                    )
                    db.add(cliente)
                    await db.flush()
                else:
                    logger.info(f"[ExtractorService] Actualizando existente: {cliente.nombre}")
                    cliente.nombre = p.nombre
                
                # Crear Participación
                participacion = Participacion(
                    cliente_id=cliente.id,
                    tramite_id=nuevo_tramite.id,
                    rol=p.rol
                )
                db.add(participacion)
                
                datos_audit["clientes"].append({
                    "id": cliente.id,
                    "nombre": cliente.nombre,
                    "rol": p.rol
                })

            await db.commit()
            logger.info(f"[ExtractorService] Éxito. Trámite ID: {nuevo_tramite.id}")
            return datos_audit

        except Exception as e:
            logger.error(f"[ExtractorService] Error: {str(e)}")
            await db.rollback()
            return {"error": str(e)}

# Para compatibilidad legacy
async def extraer_y_guardar_entidades(texto_contexto: str, db_session: AsyncSession, tenant_id: uuid.UUID) -> dict:
    service = ExtractorService()
    return await service.procesar_y_persistir(texto_contexto, db_session, tenant_id)
