import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine

async def test_conn():
    db_url = "sqlite+aiosqlite:///./ofisolve_dev.db"
    print(f"Testing connection to {db_url}...")
    engine = create_async_engine(db_url)
    try:
        async with engine.begin() as conn:
            print("Connection successful!")
    except Exception as e:
        print(f"Connection failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())
