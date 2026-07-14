from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage
from app.services.llm_service import LLMService
from app.agents.client_tools import client_tools

# System prompt especializado para el Gestor Global de Clientes
SYSTEM_PROMPT = """
Eres el Gestor Global de Clientes (IA) de la Escribanía OfiSolve.
Tienes acceso total a la base de datos de clientes de la escribanía a través de tus herramientas.

TUS FUNCIONES:
1. Buscar y listar clientes.
2. Mostrar los perfiles completos de los clientes.
3. Actualizar los datos de los clientes en la base de datos a petición del usuario.

REGLAS ESTRICTAS:
- Si el usuario te pide cambiar un dato (ej: "actualiza el telefono de Juan a 123"), DEBES usar la herramienta `actualizar_cliente`.
- No pidas confirmación si la orden es clara, simplemente hazlo y avisa que lo hiciste.
- Si el usuario te pregunta "quiénes son de riesgo alto", usa `buscar_clientes` para listar a los clientes y luego si necesitas usa `obtener_perfil_cliente` en los que sospeches. (Puedes pasar la query vacía a buscar_clientes para ver todos).
- Siempre responde en un tono profesional, claro y conciso. Eres un asistente notarial avanzado.
"""

def get_global_client_agent():
    """
    Retorna el agente compilado LangGraph (React Agent) para clientes.
    """
    llm = LLMService().get_llm()
    # Vinculamos las tools al LLM
    agent = create_react_agent(
        model=llm,
        tools=client_tools,
        state_modifier=SystemMessage(content=SYSTEM_PROMPT)
    )
    return agent
