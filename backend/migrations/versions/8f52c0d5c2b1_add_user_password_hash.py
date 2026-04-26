"""add_user_password_hash

Revision ID: 8f52c0d5c2b1
Revises: b31ceb7f4383
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f52c0d5c2b1"
down_revision: Union[str, Sequence[str], None] = "b31ceb7f4383"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("user", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("user", "password_hash")
