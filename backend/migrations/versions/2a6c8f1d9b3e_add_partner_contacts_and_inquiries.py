"""add_partner_contacts_and_inquiries

Revision ID: 2a6c8f1d9b3e
Revises: 1f4e9c2a7b6d
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2a6c8f1d9b3e"
down_revision: Union[str, Sequence[str], None] = "1f4e9c2a7b6d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("partner", sa.Column("phone", sa.String(length=64), nullable=True))
    op.add_column("partner", sa.Column("whatsapp_url", sa.String(length=1024), nullable=True))
    op.add_column("partner", sa.Column("telegram_url", sa.String(length=1024), nullable=True))
    op.add_column("partner", sa.Column("instagram_url", sa.String(length=1024), nullable=True))
    op.add_column("partner", sa.Column("website_url", sa.String(length=1024), nullable=True))

    op.create_table(
        "inquiry",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("partner_id", sa.Integer(), nullable=False),
        sa.Column("offer_id", sa.Integer(), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("target_url", sa.String(length=1024), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["offer_id"], ["offer.id"]),
        sa.ForeignKeyConstraint(["partner_id"], ["partner.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_inquiry_offer_id"), "inquiry", ["offer_id"], unique=False)
    op.create_index(op.f("ix_inquiry_partner_id"), "inquiry", ["partner_id"], unique=False)
    op.execute("ALTER TABLE public.inquiry ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format('REVOKE ALL ON TABLE public.inquiry FROM %I', role_name);
                    EXECUTE format('REVOKE USAGE, SELECT ON SEQUENCE public.inquiry_id_seq FROM %I', role_name);
                END IF;
            END LOOP;
        END $$;
        """
    )
    op.alter_column("inquiry", "target_url", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_inquiry_partner_id"), table_name="inquiry")
    op.drop_index(op.f("ix_inquiry_offer_id"), table_name="inquiry")
    op.drop_table("inquiry")
    op.drop_column("partner", "website_url")
    op.drop_column("partner", "instagram_url")
    op.drop_column("partner", "telegram_url")
    op.drop_column("partner", "whatsapp_url")
    op.drop_column("partner", "phone")
