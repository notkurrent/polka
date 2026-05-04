"""add_order_items

Revision ID: 5d2b8a9c4f1e
Revises: 3b7c9d0e1f2a
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "5d2b8a9c4f1e"
down_revision: Union[str, Sequence[str], None] = "3b7c9d0e1f2a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "order_item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("offer_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("total_price", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["offer_id"], ["offer.id"]),
        sa.ForeignKeyConstraint(["order_id"], ["order.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_order_item_offer_id"), "order_item", ["offer_id"], unique=False)
    op.create_index(op.f("ix_order_item_order_id"), "order_item", ["order_id"], unique=False)

    op.execute(
        """
        INSERT INTO order_item (order_id, offer_id, quantity, unit_price, total_price)
        SELECT "order".id, "order".offer_id, 1, offer.new_price, offer.new_price
        FROM "order"
        JOIN offer ON offer.id = "order".offer_id
        """
    )

    op.drop_constraint("order_offer_id_fkey", "order", type_="foreignkey")
    op.drop_column("order", "offer_id")

    op.execute("ALTER TABLE public.order_item ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        DO $$
        DECLARE
            role_name text;
        BEGIN
            FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                    EXECUTE format('REVOKE ALL ON TABLE public.order_item FROM %I', role_name);
                END IF;
            END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    op.add_column("order", sa.Column("offer_id", sa.Integer(), nullable=True))
    op.execute(
        """
        UPDATE "order"
        SET offer_id = first_item.offer_id
        FROM (
            SELECT DISTINCT ON (order_id) order_id, offer_id
            FROM order_item
            ORDER BY order_id, id
        ) AS first_item
        WHERE "order".id = first_item.order_id
        """
    )
    op.alter_column("order", "offer_id", nullable=False)
    op.create_foreign_key("order_offer_id_fkey", "order", "offer", ["offer_id"], ["id"])

    op.execute("ALTER TABLE public.order_item DISABLE ROW LEVEL SECURITY")
    op.drop_index(op.f("ix_order_item_order_id"), table_name="order_item")
    op.drop_index(op.f("ix_order_item_offer_id"), table_name="order_item")
    op.drop_table("order_item")
