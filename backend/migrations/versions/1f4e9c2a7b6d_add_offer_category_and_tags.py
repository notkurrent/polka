"""add_offer_category_and_tags

Revision ID: 1f4e9c2a7b6d
Revises: 72d8c4f1b9a0
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "1f4e9c2a7b6d"
down_revision: Union[str, Sequence[str], None] = "72d8c4f1b9a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("offer", sa.Column("category", sqlmodel.sql.sqltypes.AutoString(), server_default="", nullable=False))
    op.add_column("offer", sa.Column("tags", sqlmodel.sql.sqltypes.AutoString(), server_default="", nullable=False))
    op.alter_column("offer", "category", server_default=None)
    op.alter_column("offer", "tags", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("offer", "tags")
    op.drop_column("offer", "category")
