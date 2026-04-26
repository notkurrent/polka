"""make_user_tg_id_unique

Revision ID: d4f4a7b9c2e3
Revises: 8f52c0d5c2b1
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f4a7b9c2e3"
down_revision: Union[str, Sequence[str], None] = "8f52c0d5c2b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()
    duplicate_tg_ids = connection.execute(
        sa.text(
            """
            SELECT tg_id
            FROM "user"
            WHERE tg_id IS NOT NULL
            GROUP BY tg_id
            HAVING COUNT(*) > 1
            LIMIT 5
            """
        )
    ).scalars().all()
    if duplicate_tg_ids:
        sample = ", ".join(str(tg_id) for tg_id in duplicate_tg_ids)
        raise RuntimeError(
            "Cannot add unique index on user.tg_id while duplicate Telegram ids exist: "
            f"{sample}"
        )

    op.drop_index(op.f("ix_user_tg_id"), table_name="user")
    op.create_index(op.f("ix_user_tg_id"), "user", ["tg_id"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_user_tg_id"), table_name="user")
    op.create_index(op.f("ix_user_tg_id"), "user", ["tg_id"], unique=False)
