import asyncio
import sys
import os

# Añadir el directorio raíz al path para poder importar app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import engine, Base
from app.models.database import Base as SaaSBase
from app.core.config import get_settings

async def init_db():
    print("Iniciando creación de tablas en PostgreSQL...")
    async with engine.begin() as conn:
        # Importamos todos los modelos para asegurarnos de que estén registrados en Base
        from app.models.database import Usuario, ClienteSaaS, TramiteSaaS, ParticipacionSaaS
        
        # Opcional: Limpiar DB (solo Desarrollo)
        # await conn.run_sync(Base.metadata.drop_all)
        # await conn.run_sync(SaaSBase.metadata.drop_all)
        
        await conn.run_sync(Base.metadata.create_all)
        print("Tablas creadas exitosamente.")

if __name__ == "__main__":
    asyncio.run(init_db())
