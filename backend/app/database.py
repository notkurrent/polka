import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

# DATABASE_URL = "postgresql+asyncpg://user:password@localhost:5432/polka"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://polka:polka_dev_password@localhost:5432/polka")
DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"
IS_TESTING = os.getenv("POLKA_TESTING", "").lower() in {"1", "true", "yes", "on"}

engine_kwargs = {"echo": DB_ECHO, "future": True}
if IS_TESTING:
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        # SQLModel doesn't automatically create tables with async engine in a sync way,
        # but Alembic will manage the schema.
        # This is just a placeholder if we want to run without alembic for dev.
        # await conn.run_sync(SQLModel.metadata.create_all)
        pass

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
