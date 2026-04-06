import json
import asyncio
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

router = APIRouter(prefix="/api/v1/tramites", tags=["Trámites & Chat"])

# ----------- SCHEMAS -----------

class ChatInput(BaseModel):
    mensaje: str
    thread_id: str
    workspace_id: int

# ----------- LOGICA DE STREAMING -----------

async def graph_event_generator(
    mensaje: str, 
    thread_id: str, 
    workspace_id: int
) -> AsyncGenerator[str, None]:
    """
    Generador de eventos SSE para el grafo de LangGraph.
    Filtra eventos de nodos y tokens del LLM en tiempo real.
    """
    input_data = {
        "messages": [HumanMessage(content=mensaje)],
        "workspace_id": workspace_id,
        "intentos": 0,
        "aprobado": False
    }
    
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        async for event in ofisolve_graph.astream_events(input_data, config, version="v2"):
            kind = event["event"]
            name = event["name"]
            
            # 1. Detección de Inicio de Nodo (Agente trabajando)
            if kind == "on_chain_start" and name.startswith("node_"):
                node_clean_name = name.replace("node_", "").capitalize()
                yield f"data: {json.dumps({'event': 'estado', 'nodo': node_clean_name})}\n\n"
            
            # 2. Streaming de Tokens (LLM redactando)
            elif kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield f"data: {json.dumps({'event': 'token', 'texto': content})}\n\n"
            
            # 3. Finalización de Procesamiento
            elif kind == "on_chain_end" and name == "ofisolve_graph":
                yield f"data: {json.dumps({'event': 'finalizado', 'data': 'Proceso completado'})}\n\n"

    except Exception as e:
        logger.error(f"Error en streaming de LangGraph: {str(e)}")
        yield f"data: {json.dumps({'event': 'error', 'mensaje': str(e)})}\n\n"

# ----------- ENDPOINTS -----------

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_tramite_stream(
    request: Request,
    payload: ChatInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal de Chat con Streaming (SSE).
    Permite ver en tiempo real el razonamiento y redacción de los agentes.
    """
    logger.info(f"Iniciando chat stream para thread {payload.thread_id} en workspace {payload.workspace_id}")
    
    return StreamingResponse(
        graph_event_generator(
            mensaje=payload.mensaje,
            thread_id=payload.thread_id,
            workspace_id=payload.workspace_id
        ),
        media_type="text/event-stream"
    )
