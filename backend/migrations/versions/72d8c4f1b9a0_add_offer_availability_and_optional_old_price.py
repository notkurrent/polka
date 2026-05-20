"""add_offer_availability_and_optional_old_price

Revision ID: 72d8c4f1b9a0
Revises: 5d2b8a9c4f1e
Create Date: 2026-05-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "72d8c4f1b9a0"
down_revision: Union[str, Sequence[str], None] = "5d2b8a9c4f1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


offer_availability = sa.Enum(
    "IN_STOCK",
    "OUT_OF_STOCK",
    "PREORDER",
    "HIDDEN",
    name="offeravailability",
)


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    offer_availability.create(bind, checkfirst=True)
    op.add_column(
        "offer",
        sa.Column(
            "availability",
            offer_availability,
            server_default="IN_STOCK",
            nullable=False,
        ),
    )
    op.alter_column("offer", "availability", server_default=None)
    op.alter_column("offer", "old_price", existing_type=sa.Numeric(10, 2), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE offer SET old_price = 0 WHERE old_price IS NULL")
    op.alter_column("offer", "old_price", existing_type=sa.Numeric(10, 2), nullable=False)
    op.drop_column("offer", "availability")
    bind = op.get_bind()
    offer_availability.drop(bind, checkfirst=True)
