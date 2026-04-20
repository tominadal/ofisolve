import asyncio
import uuid
from langchain_core.messages import HumanMessage
from app.agents.graph import ofisolve_graph

async def debug_events():
    input_data = {
        "messages": [HumanMessage(content="Hola")],
        "tenant_id": uuid.uuid4(),
        "intentos": 0,
        "aprobado": False
    }
    config = {"configurable": {"thread_id": "test"}}
    
    print("Iniciando stream_events...")
    count = 0
    async for event in ofisolve_graph.astream_events(input_data, config, version="v2"):
        count += 1
        print(f"Event {count}: Type={type(event)} | kind={event.get('event', '?')}")
        if count > 20: break

if __name__ == "__main__":
    asyncio.run(debug_events())
