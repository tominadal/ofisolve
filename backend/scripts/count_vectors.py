import asyncio
import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

async def count_vectors():
    async with engine.connect() as conn:
        try:
            res = await conn.execute(text("SELECT count(*) FROM langchain_pg_embedding"))
            count = res.scalar()
            print(f"TOTAL VECTORS IN DB: {count}")
        except Exception as e:
            print(f"ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(count_vectors())
