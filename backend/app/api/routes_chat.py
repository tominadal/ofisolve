from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import SystemMessage, HumanMessage

from app.api.dependencies import limiter
from fastapi import Request
from app.core.config import get_settings
from app.rag.rag_service import RAGService
from app.api.routes_certificacion import _get_rag_service

router = APIRouter()

# ----------- SCHEMAS -----------

class ChatNotarialRequest(BaseModel):
    query: str
    fuentes_seleccionadas: Optional[List[str]] = None

class ChatNotarialResponse(BaseModel):
    respuesta: str
    fuentes_utilizadas: List[str] = []

# ----------- LOGICA -----------

SYSTEM_PROMPT_NOTEBOOKLM = """Eres un asistente notarial experto (un "NotebookLM Notarial").
Tu ÚNICO propósito es responder consultas legales, procedimentales y normativas basándote ESTRICTAMENTE en el contexto normativo que se te proporciona.

REGLAS DE ORO (CERO ALUCINACIÓN):
1. DEBES basar tu respuesta ÚNICAMENTE en el [CONTEXTO LEGAL] provisto abajo.
2. Si la respuesta a la pregunta del usuario NO está en el contexto provisto, DEBES responder exactamente: "No poseo información suficiente en la base documental para responder esto."
3. NO inventes jurisprudencia, NO inventes artículos de ley.
4. NUNCA respondas preguntas generales que no tengan que ver con el ámbito notarial o legal argentino.
5. Cita la fuente de donde sacaste la información si está disponible en el contexto.

[CONTEXTO LEGAL]
{contexto}
"""

@router.post("/notarial", response_model=ChatNotarialResponse)
@limiter.limit("20/minute")
async def chat_notarial(request: Request, payload: ChatNotarialRequest):
    """
    Endpoint NotebookLM: Responde preguntas usando estrictamente el RAG.
    Mantiene alucinación en mínimos imponiendo temperature=0.0.
    """
    settings = get_settings()
    
    if not settings.google_api_key or settings.google_api_key.startswith("tu-api-key"):
        return ChatNotarialResponse(
            respuesta="El backend está en modo MOCK (sin API Key de Gemini). No puedo responder consultas libres sin conectarme al modelo LLM real.",
            fuentes_utilizadas=["Mock System"]
        )

    # Buscar contexto en ChromaDB
    rag_service = _get_rag_service()
    contexto_legal = rag_service.buscar_contexto(
        query=payload.query,
        n_resultados=5,
        fuentes_seleccionadas=payload.fuentes_seleccionadas
    )

    if not contexto_legal.strip():
        # Si ni siquiera hay contexto relevante recuperado
        return ChatNotarialResponse(
            respuesta="No encontré normativa relevante en la biblioteca legal para tu consulta. Por favor, sé más específico o revisa el manual.",
            fuentes_utilizadas=[]
        )

    # Importar cliente de LangChain localmente
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
    except ImportError:
        raise HTTPException(status_code=500, detail="Librería langchain-google-genai no está instalada.")

    # Instanciar LLM estricto
    llm = ChatGoogleGenerativeAI(
        model=settings.llm_model,
        temperature=0.0, # 0 alucinación esperada
        google_api_key=settings.google_api_key
    )

    # Formatear prompt
    sys_prompt = SYSTEM_PROMPT_NOTEBOOKLM.format(contexto=contexto_legal)
    
    messages = [
        SystemMessage(content=sys_prompt),
        HumanMessage(content=payload.query)
    ]

    try:
        response = await llm.ainvoke(messages)
        return ChatNotarialResponse(
            respuesta=response.content,
            fuentes_utilizadas=["ChromaDB Notarial RAG"]
        )
    except Exception as e:
        logger.error(f"Error en chat_notarial al llamar a Gemini: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al procesar la respuesta con el LLM.")
