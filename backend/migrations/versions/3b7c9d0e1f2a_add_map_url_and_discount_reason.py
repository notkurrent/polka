"""add_map_url_and_discount_reason

Revision ID: 3b7c9d0e1f2a
Revises: f8a2d7c9e4b1
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3b7c9d0e1f2a"
down_revision: Union[str, Sequence[str], None] = "f8a2d7c9e4b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("partner", sa.Column("map_url", sa.String(length=1024), nullable=True))
    op.add_column(
        "offer",
        sa.Column("discount_reason", sa.String(), server_default="", nullable=False),
    )
    op.alter_column("offer", "discount_reason", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("offer", "discount_reason")
    op.drop_column("partner", "map_url")
