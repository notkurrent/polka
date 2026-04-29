"""enable_rls_for_public_tables

Revision ID: 4f7b2c9d1e6a
Revises: 9c2d4e6f8a10
Create Date: 2026-04-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "4f7b2c9d1e6a"
down_revision: Union[str, Sequence[str], None] = "9c2d4e6f8a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


APP_TABLES = ("user", "partner", "offer", "order", "rating")


def _quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def upgrade() -> None:
    """Restrict direct Supabase Data API access to application tables."""
    for table in APP_TABLES:
        quoted_table = _quote_identifier(table)
        op.execute(f"ALTER TABLE public.{quoted_table} ENABLE ROW LEVEL SECURITY")

    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
            table_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    FOREACH table_name IN ARRAY ARRAY['user', 'partner', 'offer', 'order', 'rating'] LOOP
                        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
                    END LOOP;
                    EXECUTE format('REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM %I',
                        role_name
                    );
                    EXECUTE format(
                        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM %I',
                        role_name
                    );
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    """Restore previous public Data API defaults."""
    for table in APP_TABLES:
        quoted_table = _quote_identifier(table)
        op.execute(f"ALTER TABLE public.{quoted_table} DISABLE ROW LEVEL SECURITY")

    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
            table_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', role_name);
                    FOREACH table_name IN ARRAY ARRAY['user', 'partner', 'offer', 'order', 'rating'] LOOP
                        EXECUTE format(
                            'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO %I',
                            table_name,
                            role_name
                        );
                    END LOOP;
                END IF;
            END LOOP;
        END $$;
        """
    )
