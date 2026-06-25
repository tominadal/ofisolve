import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.models.db_models import Workspace, Tramite, Cliente, Participacion, Base

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    
    # Activar Foreign Keys explícitamente en SQLite para que el CASCADE funcione
    from sqlalchemy import event
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.mark.asyncio
async def test_cascada_workspace_delete(db_session: AsyncSession):
    """
    Prueba que borrar un Workspace elimine sus Trámites, Clientes y Participaciones.
    Requisito: SQLite con PRAGMA foreign_keys=ON habilitado.
    """
    # 1. Crear Workspace
    ws = Workspace(nombre="Workspace Cascada Test")
    db_session.add(ws)
    await db_session.flush()

    # 2. Crear Cliente en el Workspace
    cliente = Cliente(
        workspace_id=ws.id,
        nombre_completo="Cliente Cascada Test",
        dni="11111111",
        tipo_persona="Fisica"
    )
    db_session.add(cliente)
    await db_session.flush()

    # 3. Crear Trámite en el Workspace
    tramite = Tramite(
        workspace_id=ws.id,
        nombre="Trámite Cascada Test",
        tipo="certificacion",
        estado="abierto"
    )
    db_session.add(tramite)
    await db_session.flush()

    # 4. Crear Participación
    participacion = Participacion(
        cliente_id=cliente.id,
        tramite_id=tramite.id,
        rol="Requirente"
    )
    db_session.add(participacion)
    await db_session.commit()

    # Validar que existen
    assert (await db_session.execute(select(Participacion).where(Participacion.id == participacion.id))).scalars().first() is not None

    # 5. Borrar Workspace
    await db_session.delete(ws)
    await db_session.commit()

    # 6. Validar eliminaciones en cascada
    res_tramite = await db_session.execute(select(Tramite).where(Tramite.id == tramite.id))
    assert res_tramite.scalars().first() is None, "El trámite debería haberse borrado en cascada."

    res_cliente = await db_session.execute(select(Cliente).where(Cliente.id == cliente.id))
    assert res_cliente.scalars().first() is None, "El cliente debería haberse borrado en cascada."

    res_participacion = await db_session.execute(select(Participacion).where(Participacion.id == participacion.id))
    assert res_participacion.scalars().first() is None, "La participación debería haberse borrado en cascada."
