import sys
import os
# Add the project root to sys.path so we can import 'app'
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlmodel import SQLModel
import app.models
from app.database import DATABASE_URL

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object, name, type_, reflected, compare_to):
    # Ignore PostGIS and Tiger geocoder internal tables
    if type_ == "table":
        ignore_tables = [
            'spatial_ref_sys', 'layer', 'topology', 'geocode_settings', 'geocode_settings_default',
            'countysub_lookup', 'county_lookup', 'direction_lookup', 'place_lookup',
            'secondary_unit_lookup', 'state_lookup', 'street_type_lookup', 'zip_lookup_all',
            'zip_state_loc', 'zip_state', 'zip_lookup_base', 'zip_lookup', 'bg', 'county',
            'addr', 'faces', 'edges', 'featnames', 'pagc_gaz', 'pagc_rules', 'pagc_lex',
            'tract', 'zcta5', 'place', 'addrfeat', 'tabblock', 'tabblock20', 'cousub', 'state',
            'loader_platform', 'loader_lookuptables', 'loader_variables'
        ]
        if name in ignore_tables or name.startswith('tiger_'):
            return False
    return True

def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
