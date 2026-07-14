import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.graph import ofisolve_graph
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage

async def test_routing():
    print("Iniciando test de enrutamiento...")
    
    # 1. Test Escritura
    state_escritura = {
        "messages": [HumanMessage(content="Necesito preparar una escritura de compraventa para el cliente Juan.")],
        "contexto_legal": "",
        "jurisdiccion": "CABA",
        "tenant_id": 1,
        "intentos": 0,
        "aprobado": False,
        "datos_ofuscados": {},
        "mapa_inversion": {},
        "texto_generado": "",
        "texto_final": ""
    }
    
    config = {"configurable": {"thread_id": "test_escritura", "modo_ia": "qwen2.5:7b"}}
    
    print("\n--- TEST: ESCRITURA ---")
    try:
        # Run step by step to see where it routes
        async for output in ofisolve_graph.astream(state_escritura, config):
            for node_name, node_output in output.items():
                print(f"[{node_name}] ejecutado.")
                if node_name == "router":
                    print(f" -> Tipo detectado: {node_output.get('tipo_tramite_detectado')}")
                if node_name == "validar_escritura":
                    print(f" -> Feedback del validador: {node_output.get('feedback_legal')}")
                
    except Exception as e:
        print(f"Error en escritura: {e}")

    # 2. Test Certificacion
    state_cert = {
        "messages": [HumanMessage(content="Quiero hacer una certificacion de firma.")],
        "contexto_legal": "",
        "jurisdiccion": "CABA",
        "tenant_id": 1,
        "intentos": 0,
        "aprobado": False,
        "datos_ofuscados": {},
        "mapa_inversion": {},
        "texto_generado": "",
        "texto_final": ""
    }
    
    config_cert = {"configurable": {"thread_id": "test_cert"}}
    
    print("\n--- TEST: CERTIFICACION ---")
    try:
        async for output in ofisolve_graph.astream(state_cert, config_cert):
            for node_name, node_output in output.items():
                print(f"[{node_name}] ejecutado.")
                if node_name == "router":
                    print(f" -> Tipo detectado: {node_output.get('tipo_tramite_detectado')}")
    except Exception as e:
        print(f"Error en certificacion: {e}")

if __name__ == "__main__":
    asyncio.run(test_routing())
