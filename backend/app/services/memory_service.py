import re
from loguru import logger
from sqlalchemy.future import select
from app.models.db_models import MemoriaNotarial
from langchain_ollama import ChatOllama
from app.core.config import get_settings

class MemoryService:
    """
    Servicio avanzado encargado de extraer, actualizar y persistir memoria a largo plazo (Stateful Memory).
    Actúa como un Agente Autónomo de Memoria.
    """
    
    @staticmethod
    async def extract_and_save_memory(workspace_id: int, mensaje_usuario: str, respuesta_ia: str, session) -> None:
        """
        Analiza la conversación y el estado actual de las memorias.
        Puede agregar nuevas memorias, actualizar contradictorias o borrar obsoletas.
        """
        settings = get_settings()
        if settings.ai_provider != "ollama":
            return
            
        try:
            # 1. Obtener memorias actuales para el contexto
            stmt = select(MemoriaNotarial).where(MemoriaNotarial.workspace_id == workspace_id)
            res = await session.execute(stmt)
            memorias_actuales = res.scalars().all()
            
            contexto_memorias = "No hay memorias previas."
            if memorias_actuales:
                contexto_memorias = "\n".join([f"[ID: {m.id}] {m.preferencia}" for m in memorias_actuales])

            llm = ChatOllama(model=settings.llm_model, base_url=settings.ollama_base_url, temperature=0.1)
            
            prompt = f"""
            Eres un Agente Administrador de Memoria.
            Tu tarea es analizar el último intercambio entre el usuario y la IA, y actualizar la base de datos de preferencias permanentes del usuario.
            
            MEMORIAS ACTUALES DEL USUARIO:
            {contexto_memorias}
            
            ÚLTIMO INTERCAMBIO:
            Mensaje Usuario: {mensaje_usuario}
            Respuesta IA: {respuesta_ia}
            
            REGLAS:
            1. Si el usuario no indica ninguna preferencia de formato, estilo, o instrucción permanente nueva o que contradiga las actuales, responde exactamente: NADA
            2. Si el usuario indica una NUEVA preferencia que NO contradice las actuales, responde: ADD: [descripción clara de la preferencia]
            3. Si el usuario indica una preferencia que CONTRADICE O ACTUALIZA una memoria existente, responde: UPDATE: [ID] -> [nueva descripción actualizada]
            4. Si el usuario pide explícitamente olvidar o deshacer una preferencia actual, responde: DELETE: [ID]
            
            Puedes emitir múltiples acciones en líneas separadas. Se conciso y directo en la descripción.
            """
            
            import asyncio
            response = await asyncio.wait_for(llm.ainvoke(prompt), timeout=15.0)
            resultado = response.content.strip()
            
            if not resultado or "NADA" in resultado.upper():
                return
                
            lineas = resultado.split('\n')
            cambios_realizados = False
            
            for linea in lineas:
                linea = linea.strip()
                if not linea:
                    continue
                    
                if linea.startswith("ADD:"):
                    pref = linea[4:].strip()
                    if pref:
                        nueva_memoria = MemoriaNotarial(
                            workspace_id=workspace_id,
                            preferencia=pref,
                            categoria="general"
                        )
                        session.add(nueva_memoria)
                        logger.info(f"[Memoria] Añadiendo: {pref}")
                        cambios_realizados = True
                        
                elif linea.startswith("UPDATE:"):
                    match = re.match(r"UPDATE:\s*(\d+)\s*->\s*(.+)", linea, re.IGNORECASE)
                    if match:
                        mem_id = int(match.group(1))
                        nueva_pref = match.group(2).strip()
                        # Buscar en las memorias cargadas
                        mem = next((m for m in memorias_actuales if m.id == mem_id), None)
                        if mem:
                            mem.preferencia = nueva_pref
                            logger.info(f"[Memoria] Actualizando ID {mem_id}: {nueva_pref}")
                            cambios_realizados = True
                            
                elif linea.startswith("DELETE:"):
                    match = re.match(r"DELETE:\s*(\d+)", linea, re.IGNORECASE)
                    if match:
                        mem_id = int(match.group(1))
                        mem = next((m for m in memorias_actuales if m.id == mem_id), None)
                        if mem:
                            await session.delete(mem)
                            logger.info(f"[Memoria] Borrando ID {mem_id}")
                            cambios_realizados = True
            
            if cambios_realizados:
                await session.commit()
                
        except Exception as e:
            logger.warning(f"[Memoria] Error en agente de memoria (non-critical): {e}")

    @staticmethod
    async def get_workspace_memory(workspace_id: int, session) -> str:
        """
        Obtiene las memorias activas de un workspace y las formatea para el prompt.
        """
        stmt = select(MemoriaNotarial).where(MemoriaNotarial.workspace_id == workspace_id)
        res = await session.execute(stmt)
        memorias = res.scalars().all()
        
        if not memorias:
            return ""
            
        textos = [m.preferencia for m in memorias]
        return "\n".join(f"- {t}" for t in textos)
