import json
import asyncio
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db

from app.api.dependencies import get_current_user

router = APIRouter(tags=["Documentos & Chat (Por Archivo)"])

class MensajeChatCreate(BaseModel):
    role: str  # "user" | "assistant"
    contenido: str

class MoverDocumentoInput(BaseModel):
    tramite_id_destino: int

@router.patch("/{documento_id}/mover")
async def mover_documento(
    documento_id: int,
    payload: MoverDocumentoInput,
    db: AsyncSession = Depends(get_db)
):
    """Mueve un documento a otro trámite."""
    from app.models.db_models import DocumentoLibreria
    stmt = select(DocumentoLibreria).where(DocumentoLibreria.id == documento_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
        
    doc.tramite_id = payload.tramite_id_destino
    await db.commit()
    return {"status": "ok", "tramite_id": doc.tramite_id}

# ----------- HISTORIAL DE CHAT PERMANENTE POR DOCUMENTO -----------

@router.get("/{documento_id}/mensajes")
async def obtener_mensajes(
    documento_id: int, 
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Recupera el historial de chat persistido de un documento verificando tenant.
    """
    from app.models.db_models import MensajeChat, DocumentoLibreria

    # 1. Verificar Tenant Isolation
    doc_res = await db.execute(select(DocumentoLibreria).where(DocumentoLibreria.id == documento_id))
    doc = doc_res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    if doc.workspace_id != user.workspace_id:
        raise HTTPException(status_code=403, detail="Acceso denegado al documento (Tenant Isolation)")

    stmt = (
        select(MensajeChat)
        .where(MensajeChat.documento_id == documento_id)
        .order_by(MensajeChat.timestamp.asc())
    )
    result = await db.execute(stmt)
    mensajes = result.scalars().all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "contenido": m.contenido,
            "timestamp": m.timestamp.isoformat(),
        }
        for m in mensajes
    ]


@router.post("/{documento_id}/mensajes")
async def guardar_mensaje(
    documento_id: int,
    payload: MensajeChatCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Persiste un mensaje del chat asociado a un documento en la base de datos (con tenant isolation).
    """
    from app.models.db_models import MensajeChat, DocumentoLibreria
    
    # 1. Verificar Tenant Isolation
    doc_res = await db.execute(select(DocumentoLibreria).where(DocumentoLibreria.id == documento_id))
    doc = doc_res.scalars().first()
    if not doc or doc.workspace_id != user.workspace_id:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    mensaje = MensajeChat(
        documento_id=documento_id,
        role=payload.role,
        contenido=payload.contenido,
    )
    db.add(mensaje)
    await db.commit()
    await db.refresh(mensaje)

    return {
        "id": mensaje.id,
        "documento_id": mensaje.documento_id,
        "role": mensaje.role,
        "contenido": mensaje.contenido,
        "timestamp": mensaje.timestamp.isoformat(),
    }


@router.delete("/{documento_id}/mensajes")
async def limpiar_mensajes(documento_id: int, db: AsyncSession = Depends(get_db)):
    """
    Elimina todo el historial de chat de un documento (Refresh/Reset Chat).
    También se encarga de vaciar el thread_id_langgraph si fuera necesario.
    """
    from app.models.db_models import MensajeChat, DocumentoLibreria
    from sqlalchemy import update

    # Eliminar mensajes
    await db.execute(delete(MensajeChat).where(MensajeChat.documento_id == documento_id))
    
    # Resetear el hilo conversacional para LangGraph
    await db.execute(
        update(DocumentoLibreria)
        .where(DocumentoLibreria.id == documento_id)
        .values(thread_id_langgraph=None)
    )
    
    await db.commit()
    return {"status": "ok", "mensaje": "Historial y contexto del documento eliminados exitosamente."}

# ----------- SCHEMAS & STREAMING -----------

import uuid
from typing import AsyncGenerator, Dict, Optional
from fastapi.responses import StreamingResponse
from fastapi import Request
from loguru import logger

from app.api.dependencies import limiter, get_current_user
from app.agents.graph import ofisolve_graph

class ChatInput(BaseModel):
    mensaje: str
    thread_id: str
    tenant_id: str
    history: Optional[List[Dict[str, str]]] = []

NODE_MESSAGES = {
    "ofuscar": "Protegiendo tus datos confidenciales...",
    "extractor_erp": "Extrayendo entidades al centro de trámites...",
    "buscar_rag": "Consultando normativa notarial argentina...",
    "redactar": "Generando borrador notarial...",
    "validar_legalidad": "Auditando cumplimiento y cláusulas...",
    "desofuscar": "Finalizando recomposición del documento..."
}

async def graph_event_generator(
    mensaje: str,
    thread_id: str,
    tenant_id: str,
    history: List[Dict[str, str]] = [],
    workspace_id: Optional[int] = None,
    documento_id: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    """
    Generador SSE con Soporte de Memoria por Documento.
    Inyecta contexto RAG real del trámite asociado al documento.
    """
    from langchain_core.messages import HumanMessage, AIMessage

    # Obtener el tramite_id a partir del documento para contexto RAG
    contexto_rag = ""
    # Si el cliente ya proveyó el tramite_id explícitamente en el hilo:
    if "tramite_" in thread_id:
        try:
            tramite_id = int(thread_id.split("_")[1])
        except:
            tramite_id = None
    else:
        tramite_id = None
        
    if not tramite_id and documento_id:
        from app.core.database import AsyncSessionLocal
        from app.models.db_models import DocumentoLibreria
        
        async with AsyncSessionLocal() as session:
            stmt = select(DocumentoLibreria).where(DocumentoLibreria.id == documento_id)
            res = await session.execute(stmt)
            doc = res.scalars().first()
            if doc:
                tramite_id = doc.tramite_id

    try:
        if tramite_id:
            from app.rag.rag_service import RAGService
            rag = RAGService()
            contexto_rag = await rag.buscar_contexto(
                query=mensaje,
                tramite_id=tramite_id,
                n_resultados=4,
            )
    except Exception as e:
        logger.warning(f"RAG context fetch failed (non-critical): {e}")

    import asyncio
    initial_messages = []
    MAX_HISTORY_CHARS = 4000 # Pruning agresivo para no asfixiar a Ollama (OOM)
    current_chars = 0
    
    # Procesar de atrás hacia adelante para conservar lo más reciente
    for msg in reversed((history or [])[-10:]):
        if current_chars > MAX_HISTORY_CHARS:
            break
        msg_content = msg.get("content", msg.get("contenido", ""))[:1000] # Limitar también mensajes individuales largos
        current_chars += len(msg_content)
        
        if msg["role"] == "user":
            initial_messages.insert(0, HumanMessage(content=msg_content))
        elif msg["role"] == "assistant":
            initial_messages.insert(0, AIMessage(content=msg_content))

    mensaje_con_contexto = mensaje
    if contexto_rag:
        mensaje_con_contexto = (
            f"{mensaje}\n\n"
            f"--- CONTEXTO LEGAL Y DOCUMENTAL RELEVANTE ---\n"
            f"{contexto_rag}\n"
            f"--- FIN DEL CONTEXTO ---"
        )

    initial_messages.append(HumanMessage(content=mensaje_con_contexto))

    input_data = {
        "messages": initial_messages,
        "tenant_id": tenant_id,
        "intentos": 0,
        "aprobado": False
    }

    config = {"configurable": {"thread_id": thread_id}}

    try:
        # Timeout estricto de 120s para abortar si la IA se queda colgada
        async with asyncio.timeout(120.0):
            async for event in ofisolve_graph.astream_events(input_data, config, version="v2"):
                kind = event["event"]
                name = event["name"]

                if kind == "on_chain_start" and name in NODE_MESSAGES:
                    friendly_msg = NODE_MESSAGES[name]
                    yield f"data: {json.dumps({'event': 'estado', 'nodo': name, 'mensaje': friendly_msg})}\n\n"

                elif kind == "on_chat_model_stream":
                    tags = event.get("tags", [])
                    if "chat_stream" in tags:
                        content = event["data"]["chunk"].content
                        if content:
                            yield f"data: {json.dumps({'event': 'token', 'texto': content})}\n\n"

                elif kind == "on_chain_end":
                    if name == "desofuscar":
                        output = event["data"].get("output", {})
                        final_text = output.get("texto_final", "")
                        if final_text:
                            yield f"data: {json.dumps({'event': 'finalizado', 'texto_completo': final_text})}\n\n"
                    elif name == "LangGraph":
                        yield f"data: {json.dumps({'event': 'finalizado', 'data': 'Proceso completado'})}\n\n"

    except asyncio.TimeoutError:
        logger.error("[SSE Error] Timeout de IA excedido (120s)")
        yield f"data: {json.dumps({'event': 'error', 'mensaje': 'Tiempo de espera excedido. La IA local está saturada.', 'detalle': 'Timeout'})}\n\n"
    except Exception as e:
        logger.error(f"[SSE Error] {str(e)}")
        # FALLBACK MOCK PARA MODO SIMULADO
        fallback_msg = "Lo siento, el motor IA local no está disponible. [Modo Simulado Activo: Este es un mensaje de prueba para que puedas experimentar la interfaz de chat.]"
        yield f"data: {json.dumps({'event': 'estado', 'nodo': 'IA_Local', 'mensaje': 'Conexión fallida. Usando modo simulado'})}\n\n"
        
        # Simular streaming de tokens
        import asyncio
        for word in fallback_msg.split():
            yield f"data: {json.dumps({'event': 'token', 'texto': word + ' '})}\n\n"
            await asyncio.sleep(0.05)
            
        yield f"data: {json.dumps({'event': 'finalizado', 'texto_completo': fallback_msg})}\n\n"

@router.post("/chat")
@router.post("/chat/")
@limiter.limit("20/minute")
async def chat_documento_stream(
    request: Request,
    payload: ChatInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint principal de comunicación con la IA enfocado en Documentos.
    """
    logger.info(f"Stream iniciado por documento: Tenant {payload.tenant_id} | Hilo {payload.thread_id}")

    # Extraer documento_id del thread_id (formato: "doc_{id}")
    documento_id = None
    if payload.thread_id.startswith("doc_"):
        try:
            documento_id = int(payload.thread_id.split("_")[1])
        except (IndexError, ValueError):
            pass

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
            tenant_id=str(payload.tenant_id),
            history=payload.history or [],
            documento_id=documento_id,
        ),
        headers=headers
    )

@router.post("/{documento_id}/lock")
async def lock_document(documento_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    from app.models.db_models import DocumentoLibreria
    import datetime
    from sqlalchemy import update
    
    stmt = (
        update(DocumentoLibreria)
        .where(
            (DocumentoLibreria.id == documento_id) & 
            ((DocumentoLibreria.locked_by_user_id.is_(None)) | (DocumentoLibreria.locked_by_user_id == user.id))
        )
        .values(
            locked_by_user_id=user.id,
            locked_at=datetime.datetime.utcnow()
        )
        .execution_options(synchronize_session="fetch")
    )
    
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        # Falla porque no existe o está bloqueado por otro
        doc_exists = await db.execute(select(DocumentoLibreria.id).where(DocumentoLibreria.id == documento_id))
        if not doc_exists.scalars().first():
            raise HTTPException(status_code=404, detail="Documento no encontrado")
        raise HTTPException(status_code=403, detail="El documento ya está bloqueado por otro usuario")
        
    return {"status": "locked"}

@router.post("/{documento_id}/unlock")
async def unlock_document(documento_id: int, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    from app.models.db_models import DocumentoLibreria
    
    result = await db.execute(select(DocumentoLibreria).where(DocumentoLibreria.id == documento_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
        
    if doc.locked_by_user_id == user.id or user.rol == "Admin":
        doc.locked_by_user_id = None
        doc.locked_at = None
        await db.commit()
    return {"status": "unlocked"}
