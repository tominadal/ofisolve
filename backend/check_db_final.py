import asyncio
from app.core.database import AsyncSessionLocal
from app.models.db_models import Cliente, Tramite
from sqlalchemy import select

async def list_data():
    async with AsyncSessionLocal() as db:
        # List Clientes
        result = await db.execute(select(Cliente))
        clientes = result.scalars().all()
        print("--- CLIENTES ---")
        for c in clientes:
            print(f"ID: {c.id} | Nombre: {c.nombre_completo}")
        
        # List ALL Tramites
        result = await db.execute(select(Tramite))
        tramites = result.scalars().all()
        print("\n--- TODOS LOS TRAMITES ---")
        for t in tramites:
            print(f"ID: {t.id} | Titulo: {t.nombre} | Cliente ID: {t.cliente_id}")

if __name__ == "__main__":
    asyncio.run(list_data())
