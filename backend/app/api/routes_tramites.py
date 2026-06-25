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

router = APIRouter(tags=["Trámites & Chat Streaming"])

# ----------- SCHEMAS -----------

class ChatInput(BaseModel):
    mensaje: str
    thread_id: str
    tenant_id: uuid.UUID
    history: Optional[List[Dict[str, str]]] = []


class MensajeChatCreate(BaseModel):
    role: str  # "user" | "assistant"
    contenido: str


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
    tenant_id: str,
    history: List[Dict[str, str]] = [],
    workspace_id: int = 1,
    tramite_id: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    """
    Generador SSE con Búfer de Filtrado Anti-JSON y Soporte de Memoria.
    (C) Inyecta contexto RAG real del trámite activo antes de enviar al grafo.
    """
    from langchain_core.messages import HumanMessage, AIMessage

    # (C) Enriquecer el mensaje con contexto RAG real (normativa + docs del trámite)
    contexto_rag = ""
    try:
        from app.rag.rag_service import RAGService
        rag = RAGService()
        contexto_rag = rag.buscar_contexto(
            query=mensaje,
            tramite_id=tramite_id,
            n_resultados=4,
        )
    except Exception as e:
        logger.warning(f"RAG context fetch failed (non-critical): {e}")

    # Reconstruir historial de mensajes
    initial_messages = []
    for msg in (history or [])[-10:]:
        if msg["role"] == "user":
            initial_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            initial_messages.append(AIMessage(content=msg["content"]))

    # Construir el mensaje enriquecido con contexto RAG
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
        async for event in ofisolve_graph.astream_events(input_data, config, version="v2"):
            kind = event["event"]
            name = event["name"]

            if kind == "on_chain_start" and name in NODE_MESSAGES:
                friendly_msg = NODE_MESSAGES[name]
                logger.debug(f"[Graph SSE] Ingresando al nodo: {name}")
                yield f"data: {json.dumps({'event': 'estado', 'nodo': name, 'mensaje': friendly_msg})}\n\n"

            elif kind == "on_chat_model_stream":
                tags = event.get("tags", [])
                if "chat_stream" in tags:
                    content = event["data"]["chunk"].content
                    if content:
                        yield f"data: {json.dumps({'event': 'token', 'texto': content})}\n\n"

            elif kind == "on_chain_end":
                logger.debug(f"[Graph SSE] Finalizando nodo: {name}")
                if name == "desofuscar":
                    output = event["data"].get("output", {})
                    final_text = output.get("texto_final", "")
                    if final_text:
                        yield f"data: {json.dumps({'event': 'finalizado', 'texto_completo': final_text})}\n\n"

                elif name == "LangGraph":
                    yield f"data: {json.dumps({'event': 'finalizado', 'data': 'Proceso completado'})}\n\n"

    except Exception as e:
        logger.error(f"[SSE Error] {str(e)}")
        yield f"data: {json.dumps({'event': 'error', 'mensaje': 'Error en la IA', 'detalle': str(e)})}\n\n"


# ----------- ENDPOINTS -----------

class AprobacionTramite(BaseModel):
    contenido: str


@router.post("/{tramite_id}/aprobar")
@router.post("/{tramite_id}/aprobar/")
@limiter.limit("5/minute")
async def aprobar_tramite(
    request: Request,
    tramite_id: int,
    payload: AprobacionTramite,
    db: AsyncSession = Depends(get_db)
):
    """Finaliza un trámite (HITL). Persiste el texto final y cierra el estado."""
    from app.models.db_models import Tramite
    from sqlalchemy import select

    logger.info(f"Aprobando trámite {tramite_id}...")

    stmt = select(Tramite).where(Tramite.id == tramite_id)
    res = await db.execute(stmt)
    tramite = res.scalars().first()

    if not tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")

    # 1. Generar DOCX definitivo
    from app.services.document_service import DocumentService
    doc_svc = DocumentService()
    
    # Obtener nombre del escribano desde el workspace (o defaults si falla)
    from app.models.db_models import Workspace
    workspace_stmt = select(Workspace).where(Workspace.id == tramite.workspace_id)
    ws_res = await db.execute(workspace_stmt)
    workspace = ws_res.scalars().first()
    
    datos_docx = {
        "texto_certificacion": payload.contenido,
        "tipo_certificacion_display": "DOCUMENTO NOTARIAL (APROBADO)",
        "nombre_escribano": workspace.nombre if workspace else "N/A",
        "nro_registro": "N/A", # idealmente sacar del usuario
    }
    
    ruta_docx = doc_svc.generar_docx(
        datos_finales=datos_docx,
        nombre_plantilla="certificacion_generica.docx"
    )
    
    # 2. Persistir en base de datos
    from app.models.db_models import DocumentoLibreria
    import datetime
    
    nuevo_doc = DocumentoLibreria(
        workspace_id=tramite.workspace_id,
        tramite_id=tramite.id,
        cliente_id=tramite.cliente_id,
        nombre=ruta_docx.name,
        tipo="docx",
        path=str(ruta_docx),
        is_generated=True,
        fecha_subida=datetime.datetime.utcnow()
    )
    db.add(nuevo_doc)

    # 3. Cerrar trámite
    tramite.estado = "completado"
    await db.commit()

    return {
        "status": "success",
        "tramite_id": tramite_id,
        "mensaje": "Trámite cerrado y archivado correctamente"
    }


@router.post("/chat")
@router.post("/chat/")
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

    # Extraer tramite_id del thread_id (formato: "tramite_{id}" o UUID)
    tramite_id = None
    if payload.thread_id.startswith("tramite_"):
        try:
            tramite_id = int(payload.thread_id.split("_")[1])
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
            tramite_id=tramite_id,
        ),
        headers=headers
    )


# ----------- HISTORIAL DE CHAT (Mejora B) -----------

@router.get("/{tramite_id}/mensajes")
async def obtener_mensajes(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """
    (B) Recupera el historial de chat persistido de una carpeta.
    El frontend lo carga al abrir una carpeta para retomar la conversación.
    """
    from app.models.db_models import MensajeChat
    from sqlalchemy import select

    stmt = (
        select(MensajeChat)
        .where(MensajeChat.tramite_id == tramite_id)
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


@router.post("/{tramite_id}/mensajes")
async def guardar_mensaje(
    tramite_id: int,
    payload: MensajeChatCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    (B) Persiste un mensaje del chat en la base de datos.
    El frontend llama este endpoint al enviar o recibir cada mensaje.
    """
    from app.models.db_models import MensajeChat

    mensaje = MensajeChat(
        tramite_id=tramite_id,
        role=payload.role,
        contenido=payload.contenido,
    )
    db.add(mensaje)
    await db.commit()
    await db.refresh(mensaje)

    return {
        "id": mensaje.id,
        "tramite_id": mensaje.tramite_id,
        "role": mensaje.role,
        "contenido": mensaje.contenido,
        "timestamp": mensaje.timestamp.isoformat(),
    }


@router.delete("/{tramite_id}/mensajes")
async def limpiar_mensajes(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina todo el historial de chat de un trámite."""
    from app.models.db_models import MensajeChat
    from sqlalchemy import delete

    await db.execute(delete(MensajeChat).where(MensajeChat.tramite_id == tramite_id))
    await db.commit()
    return {"status": "ok", "mensaje": "Historial eliminado"}


# ----------- PARTICIPACIONES -----------

@router.get("/{tramite_id}/participaciones")
@router.get("/{tramite_id}/participaciones/")
async def obtener_participaciones(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene los clientes y sus roles vinculados a un trámite."""
    from app.models.db_models import Participacion, Cliente
    from sqlalchemy import select

    stmt = (
        select(Participacion, Cliente.nombre_completo, Cliente.dni)
        .join(Cliente, Participacion.cliente_id == Cliente.id)
        .where(Participacion.tramite_id == tramite_id)
    )

    result = await db.execute(stmt)
    participaciones = []

    for row in result.all():
        p, nombre, dni = row
        participaciones.append({
            "id": p.id,
            "cliente_id": p.cliente_id,
            "nombre": nombre,
            "dni_cuit": dni,
            "rol": p.rol
        })

    return {
        "tramite_id": tramite_id,
        "clientes": participaciones
    }


from pydantic import BaseModel

class ParticipacionCreate(BaseModel):
    cliente_id: int
    rol: str


@router.post("/{tramite_id}/participaciones", status_code=status.HTTP_201_CREATED)
async def agregar_participacion(
    tramite_id: int,
    payload: ParticipacionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Vincula un cliente a un trámite con un rol."""
    from app.models.db_models import Participacion, Cliente, Tramite

    t = await db.execute(select(Tramite).where(Tramite.id == tramite_id))
    if not t.scalars().first():
        raise HTTPException(status_code=404, detail="Trámite no encontrado")

    c = await db.execute(select(Cliente).where(Cliente.id == payload.cliente_id))
    cliente = c.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    existing = await db.execute(
        select(Participacion).where(
            Participacion.tramite_id == tramite_id,
            Participacion.cliente_id == payload.cliente_id
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="El cliente ya está vinculado a este trámite")

    nueva = Participacion(tramite_id=tramite_id, cliente_id=payload.cliente_id, rol=payload.rol)
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)
    return {
        "id": nueva.id,
        "tramite_id": tramite_id,
        "cliente_id": payload.cliente_id,
        "nombre": cliente.nombre_completo,
        "dni_cuit": cliente.dni,
        "rol": nueva.rol,
    }


@router.delete("/{tramite_id}/participaciones/{participacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_participacion(tramite_id: int, participacion_id: int, db: AsyncSession = Depends(get_db)):
    """Desvincula un interviniente de un trámite."""
    from app.models.db_models import Participacion

    result = await db.execute(
        select(Participacion).where(
            Participacion.id == participacion_id,
            Participacion.tramite_id == tramite_id
        )
    )
    p = result.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Participación no encontrada")
    await db.delete(p)
    await db.commit()


@router.get("/{tramite_id}/saludo")
async def saludar_tramite(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """
    Genera un saludo contextual al abrir una carpeta.
    (F) Si el LLM no está disponible, genera un resumen basado en datos de la DB
    sin llamar al LLM — nunca falla.
    """
    from app.models.db_models import Tramite, Participacion, Cliente, DocumentoLibreria
    from app.services.llm_service import LLMService
    from sqlalchemy import select

    # 1. Obtener datos del trámite
    result = await db.execute(select(Tramite).where(Tramite.id == tramite_id))
    tramite = result.scalars().first()
    if not tramite:
        raise HTTPException(status_code=404, detail="Trámite no encontrado")

    # 2. Obtener participaciones
    stmt = (
        select(Participacion, Cliente.nombre_completo)
        .join(Cliente, Participacion.cliente_id == Cliente.id)
        .where(Participacion.tramite_id == tramite_id)
    )
    res_p = await db.execute(stmt)
    part_list = [f"{row[1]} ({row[0].rol})" for row in res_p.all()]

    # 3. Obtener documentos de la carpeta
    res_docs = await db.execute(
        select(DocumentoLibreria).where(DocumentoLibreria.tramite_id == tramite_id)
    )
    docs = res_docs.scalars().all()

    participantes_str = ", ".join(part_list) if part_list else "Sin participantes registrados aún."
    docs_str = ", ".join(d.nombre for d in docs) if docs else "Sin documentos subidos."

    # (F) Resumen sin LLM — siempre disponible
    saludo_fallback = (
        f"📁 **{tramite.nombre}** — {tramite.tipo}\n\n"
        f"**Intervinientes:** {participantes_str}\n"
        f"**Documentos en carpeta:** {docs_str}\n\n"
        f"¿En qué puedo ayudarte con este trámite?"
    )

    # 4. Intentar mejorar el saludo con el LLM (no bloqueante)
    contexto = (
        f"CARPETA: {tramite.nombre}\n"
        f"TIPO: {tramite.tipo}\n"
        f"DESCRIPCIÓN: {tramite.descripcion or 'Sin descripción.'}\n"
        f"INTERVINIENTES: {participantes_str}\n"
        f"DOCUMENTOS: {docs_str}"
    )
    query = (
        "Genera un saludo breve y profesional para el escribano. "
        "Resume el estado de la carpeta y propón el próximo paso lógico. "
        "Sé conciso (máximo 3 líneas)."
    )

    try:
        llm = LLMService()
        respuesta = await asyncio.wait_for(
            llm.chat(query=f"{contexto}\n\n{query}", history=[], tags=["saludo_inicial"]),
            timeout=8.0  # timeout de 8 segundos — si Ollama tarda más, usamos el fallback
        )

        # Si la respuesta parece un error de conexión, usar fallback
        if "connection" in respuesta.lower() or "failed" in respuesta.lower() or "error" in respuesta.lower():
            logger.warning(f"LLM retornó error en saludo — usando fallback: {respuesta[:80]}")
            return {"saludo": saludo_fallback}

        return {"saludo": respuesta}

    except asyncio.TimeoutError:
        logger.warning(f"LLM timeout en saludo de tramite {tramite_id} — usando fallback sin LLM")
        return {"saludo": saludo_fallback}
    except Exception as e:
        logger.error(f"Error generando saludo con LLM: {e} — usando fallback")
        return {"saludo": saludo_fallback}


@router.get("/{tramite_id}/archivos")
async def obtener_archivos_tramite(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene TODOS los archivos vinculados a un trámite (subidos + generados)."""
    from app.models.db_models import DocumentoLibreria
    from sqlalchemy import select

    stmt = (
        select(DocumentoLibreria)
        .where(DocumentoLibreria.tramite_id == tramite_id)
        .order_by(DocumentoLibreria.fecha_subida.desc())
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    return [
        {
            "id": d.id,
            "nombre": d.nombre,
            "tipo": d.tipo,
            "fecha_subida": d.fecha_subida.isoformat(),
            "is_generated": d.is_generated,
        }
        for d in docs
    ]


@router.get("/documentos/{doc_id}/contenido")
async def obtener_contenido_documento(doc_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene el contenido de texto de un documento para el editor."""
    from app.services.document_service import DocumentService
    doc_svc = DocumentService()

    contenido = await doc_svc.obtener_contenido(db, doc_id)
    if contenido is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado o ilegible")

    return {"id": doc_id, "contenido": contenido}


@router.post("/documentos/{doc_id}/guardar")
async def guardar_documento(doc_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    """Guarda los cambios realizados en el editor de vuelta al archivo físico."""
    from app.services.document_service import DocumentService
    doc_svc = DocumentService()

    contenido = payload.get("contenido", "")
    success = await doc_svc.guardar_contenido(db, doc_id, contenido)

    if not success:
        raise HTTPException(status_code=500, detail="Error al guardar el archivo")

    return {"status": "success", "message": "Documento guardado correctamente"}


# ----------- DOCUMENTOS GENERADOS -----------

@router.get("/{tramite_id}/documentos-generados")
async def obtener_documentos_generados(tramite_id: int, db: AsyncSession = Depends(get_db)):
    """
    Devuelve los documentos (.docx) reales asociados a un trámite.
    Incluye el contenido para previsualizar en el frontend.
    """
    from app.models.db_models import DocumentoLibreria
    from app.services.document_service import DocumentService

    stmt = (
        select(DocumentoLibreria)
        .where(
            DocumentoLibreria.tramite_id == tramite_id,
            DocumentoLibreria.is_generated == True
        )
        .order_by(DocumentoLibreria.fecha_subida.desc())
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()

    doc_svc = DocumentService()
    response = []
    for d in docs:
        preview = ""
        try:
            contenido = await doc_svc.obtener_contenido(db, d.id)
            preview = (contenido or "")[:300]
        except Exception:
            pass
        response.append({
            "id": d.id,
            "nombre": d.nombre,
            "tipo": d.tipo,
            "fechaGeneracion": d.fecha_subida.isoformat(),
            "version": 1,
            "contenidoPreview": preview,
            "tramite_id": d.tramite_id,
        })
    return response
