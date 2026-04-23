import asyncio
from app.core.database import AsyncSessionLocal
from app.models.db_models import Usuario
from app.core.security import get_password_hash
from sqlalchemy import select

async def reset_admin():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Usuario).filter(Usuario.email == "admin@ofisolve.com"))
        user = result.scalars().first()
        if user:
            user.hashed_password = get_password_hash("admin123")
            print("Admin password reset to admin123")
        else:
            user = Usuario(
                email="admin@ofisolve.com",
                hashed_password=get_password_hash("admin123"),
                nombre_completo="Administrador Sistema",
                rol="Admin",
                is_active=True
            )
            db.add(user)
            print("Admin user created with password admin123")
        await db.commit()

if __name__ == "__main__":
    asyncio.run(reset_admin())
