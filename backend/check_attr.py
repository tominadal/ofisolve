import asyncio
from app.core.database import AsyncSessionLocal
from app.models.db_models import Tramite
from sqlalchemy import select

async def check_attr():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tramite).limit(1))
        t = result.scalars().first()
        print(f"Tramite object: {t}")
        print(f"Has cliente_id attr: {hasattr(t, 'cliente_id')}")
        if hasattr(t, 'cliente_id'):
            print(f"cliente_id value: {t.cliente_id}")

if __name__ == "__main__":
    asyncio.run(check_attr())
