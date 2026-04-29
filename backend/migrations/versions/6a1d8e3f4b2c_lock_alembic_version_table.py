"""lock_alembic_version_table

Revision ID: 6a1d8e3f4b2c
Revises: 4f7b2c9d1e6a
Create Date: 2026-04-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "6a1d8e3f4b2c"
down_revision: Union[str, Sequence[str], None] = "4f7b2c9d1e6a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Restrict direct Supabase Data API access to Alembic metadata."""
    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format('REVOKE ALL ON TABLE public.alembic_version FROM %I', role_name);
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    """Restore previous direct Data API defaults for Alembic metadata."""
    op.execute("ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alembic_version TO %I', role_name);
                END IF;
            END LOOP;
        END $$;
        """
    )
