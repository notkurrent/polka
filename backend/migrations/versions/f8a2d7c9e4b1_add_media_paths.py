"""add_media_paths

Revision ID: f8a2d7c9e4b1
Revises: e2f6a1b9c8d4
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f8a2d7c9e4b1"
down_revision: Union[str, Sequence[str], None] = "e2f6a1b9c8d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("offer", sa.Column("image_path", sa.String(length=512), nullable=True))
    op.add_column("partner", sa.Column("logo_path", sa.String(length=512), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("partner", "logo_path")
    op.drop_column("offer", "image_path")
