from loguru import logger
from app.agents.state import CertificacionState
from app.services.llm_service import LLMService

async def node_asesor_notarial(state: CertificacionState, config: dict) -> dict:
    """Nodo Asesor Notarial Virtual: Modo 'Consultas' enfocado en responder y analizar antecedentes."""
    logger.info(f"[Agente Asesor] Generando respuesta consultiva (Turno {state.get('intentos', 0) + 1})...")
    modelo_override = config.get("configurable", {}).get("modelo_ia")
    llm_svc = LLMService(modelo_override=modelo_override)
    
    contexto = state.get("contexto_legal", "")
    
    query = state["messages"][-1].content if state["messages"] else ""
    history = [{"role": "user" if getattr(msg, 'type', 'user') == "human" else "assistant", "content": msg.content} for msg in state["messages"][:-1]]
    
    # Custom System Prompt override for Asesor
    system_prompt = """Eres el Asesor Notarial Virtual de la Escribanía. Tu rol no es redactar actas, sino analizar consultas, explicar normativas y revisar los antecedentes de los clientes.
Responde de manera formal, clara y concisa. Si te piden información sobre un cliente o trámite, usa el contexto documental provisto para responder.
Mantén un tono profesional, servicial y erudito en derecho notarial y civil argentino (especialmente CABA y Provincia de Buenos Aires).
"""
    
    contexto_asesor = f"{system_prompt}\n\n--- ANTECEDENTES Y NORMATIVA ENCONTRADA ---\n{contexto}"
    
    respuesta = await llm_svc.chat(query=query, history=history, contexto_legal=contexto_asesor, tags=["chat_stream"])
    
    # En el modo asesor, el texto_generado es directamente la respuesta final, no pasa por validadores.
    return {"texto_generado": respuesta, "texto_final": respuesta, "aprobado": True, "intentos": state.get("intentos", 0) + 1}
