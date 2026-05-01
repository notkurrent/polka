"""add_offer_archive_flag

Revision ID: e2f6a1b9c8d4
Revises: 6a1d8e3f4b2c
Create Date: 2026-05-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2f6a1b9c8d4"
down_revision: Union[str, Sequence[str], None] = "6a1d8e3f4b2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "offer",
        sa.Column("is_archived", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.alter_column("offer", "is_archived", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("offer", "is_archived")
