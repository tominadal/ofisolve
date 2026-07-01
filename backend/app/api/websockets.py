from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # Mapea document_id -> lista de WebSockets activos
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Mapea document_id -> websocket que tiene el lock (o None)
        self.document_locks: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, document_id: int):
        await websocket.accept()
        if document_id not in self.active_connections:
            self.active_connections[document_id] = []
        self.active_connections[document_id].append(websocket)
        logger.info(f"Cliente conectado al documento {document_id}. Total: {len(self.active_connections[document_id])}")

        # Informar al nuevo cliente si el documento ya está bloqueado
        if document_id in self.document_locks and self.document_locks[document_id] is not None:
            # Enviar evento de lock simulado para que se deshabilite su editor
            await websocket.send_text(json.dumps({"event": "lock", "user": "Otro usuario"}))

    def disconnect(self, websocket: WebSocket, document_id: int):
        if document_id in self.active_connections:
            if websocket in self.active_connections[document_id]:
                self.active_connections[document_id].remove(websocket)
            if not self.active_connections[document_id]:
                del self.active_connections[document_id]
                if document_id in self.document_locks:
                    del self.document_locks[document_id]
        
        # Si el que se desconecta tenía el lock, liberarlo para los demás
        if self.document_locks.get(document_id) == websocket:
            self.document_locks[document_id] = None
            # Avisar a los que quedan que se liberó
            import asyncio
            asyncio.create_task(self.broadcast(json.dumps({"event": "unlock"}), document_id, websocket))

        logger.info(f"Cliente desconectado del documento {document_id}.")

    async def broadcast(self, message: str, document_id: int, sender: WebSocket):
        try:
            data = json.loads(message)
            if data.get("event") == "lock":
                self.document_locks[document_id] = sender
            elif data.get("event") == "unlock":
                if self.document_locks.get(document_id) == sender:
                    self.document_locks[document_id] = None
        except Exception:
            pass # Ignorar parseos fallidos

        if document_id in self.active_connections:
            for connection in self.active_connections[document_id]:
                if connection != sender:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        logger.error(f"Error enviando mensaje: {e}")

manager = ConnectionManager()

@router.websocket("/editor/ws/{document_id}")
async def websocket_endpoint(websocket: WebSocket, document_id: int):
    await manager.connect(websocket, document_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, document_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, document_id)
