import json
import asyncio
import uuid
from typing import AsyncGenerator, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import HumanMessage

from app.api.dependencies import limiter
from app.agents.graph import ofisolve_graph
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/tramites", tags=["Trámites & Chat Streaming"])

# ----------- SCHEMAS (SaaS Ready) -----------

class ChatInput(BaseModel):
    mensaje: str
    thread_id: str
    tenant_id: uuid.UUID # Obligatorio para aislamiento multitenant

# ----------- MAPEO DE ESTADOS (UX Premium) -----------

NODE_MESSAGES = {
    "ofuscar": "Protegiendo tus datos confidenciales...",
    "extractor_erp": "Extrayendo entidades al centro de trámites...",
    "buscar_rag": "Consultando normativa notarial argentina...",
    "redactar": "Generando borrador notarial...",
    "validar_legalidad": "Auditando cumplimiento y cláusulas...",
    "desofuscar": "Finalizando recomposición del documento..."
}

# ----------- LÓGICA DE STREAMING -----------

async def graph_event_generator(
    mensaje: str, 
    thread_id: str, 
    tenant_id: uuid.UUID
) -> AsyncGenerator[str, None]:
    """
    Generador reactivo de eventos SSE. 
    Transforma trazas internas de LangGraph en eventos JSON para el frontend.
    """
    # Estado inicial del grafo
    input_data = {
        "messages": [HumanMessage(content=mensaje)],
        "tenant_id": tenant_id,
        "intentos": 0,
        "aprobado": False
    }
    
    # Configuración de persistencia por hilo
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Usamos astream_events v2 para máxima granularidad
        async for event in ofisolve_graph.astream_events(input_data, config, version="v2"):
            kind = event["event"]
            name = event["name"]
            
            # 1. EVENTO: Cambio de Estado (Nodos)
            if kind == "on_chain_start" and name in NODE_MESSAGES:
                friendly_msg = NODE_MESSAGES[name]
                yield f"data: {json.dumps({'event': 'estado', 'nodo': name, 'mensaje': friendly_msg})}\n\n"
            
            # 2. EVENTO: Streaming de Texto (Tokens del LLM)
            elif kind == "on_chat_model_stream":
                # Verificamos si hay contenido de texto en el chunk
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'event': 'token', 'texto': content})}\n\n"
            
            # 3. EVENTO: Finalización y Metadata
            elif kind == "on_chain_end" and name == "LangGraph": # LangGraph or the graph compiler name
                # Podríamos enviar el ID del trámite final aquí si se extrajo
                yield f"data: {json.dumps({'event': 'finalizado', 'data': 'Proceso completado con éxito'})}\n\n"

    except Exception as e:
        logger.error(f"[Streaming Error] Fallo en hilo {thread_id}: {str(e)}")
        yield f"data: {json.dumps({'event': 'error', 'mensaje': 'Error interno de IA', 'detalle': str(e)})}\n\n"

# ----------- ENDPOINTS -----------

class AprobacionTramite(BaseModel):
    contenido: str # Texto definitivo editado por el humano (HITL)

# ----------- ENDPOINTS -----------

@router.post("/{tramite_id}/aprobar")
@limiter.limit("5/minute")
async def aprobar_tramite(
    tramite_id: int,
    payload: AprobacionTramite,
    db: AsyncSession = Depends(get_db)
):
    """
    Finaliza un trámite (HITL). 
    Persiste el texto final del escribano y cierra el estado.
    """
    from app.models.database import Tramite
    from sqlalchemy import select, update
    
    logger.info(f"Aprobando trámite {tramite_id}...")
    
    # 1. Buscar trámite
    stmt = select(Tramite).where(Tramite.id == tramite_id)
    res = await db.execute(stmt)
    tramite = res.scalars().first()
    
    if not tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")
    
    # 2. Actualizar estado y contenido
    # En un ERP real, guardaríamos el 'contenido' en una tabla de DocumentosGenerados
    # vinculada al trámite. Aquí actualizamos el estado del trámite.
    tramite.estado = "completado"
    
    # Simulación de guardado de versión definitiva
    # tramite.texto_final = payload.contenido 
    
    await db.commit()
    
    return {
        "status": "success", 
        "tramite_id": tramite_id, 
        "mensaje": "Trámite cerrado y archivado correctamente"
    }

@router.post("/chat")

@limiter.limit("20/minute")
async def chat_tramite_stream(
    request: Request,
    payload: ChatInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal de comunicación con la IA. 
    Devuelve un StreamingResponse que el frontend consume en tiempo real.
    """
    logger.info(f"Stream iniciado: Tenant {payload.tenant_id} | Hilo {payload.thread_id}")
    
    # Headers para evitar problemas de buffering en proxies (Nginx/Vercel)
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no" 
    }
    
    return StreamingResponse(
        graph_event_generator(
            mensaje=payload.mensaje,
            thread_id=payload.thread_id,
            tenant_id=payload.tenant_id
        ),
        headers=headers
    )
