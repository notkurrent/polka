"""add_partner_moderation

Revision ID: 9c2d4e6f8a10
Revises: 707604fea493
Create Date: 2026-04-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "9c2d4e6f8a10"
down_revision: Union[str, Sequence[str], None] = "707604fea493"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


partner_status = sa.Enum(
    "PENDING",
    "APPROVED",
    "REJECTED",
    "SUSPENDED",
    name="partnerstatus",
)


def upgrade() -> None:
    """Upgrade schema."""
    partner_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "partner",
        sa.Column("status", partner_status, server_default="APPROVED", nullable=False),
    )
    op.alter_column("partner", "status", server_default=None)
    op.add_column("partner", sa.Column("review_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column("partner", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("partner", sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_partner_reviewed_by_user_id_user",
        "partner",
        "user",
        ["reviewed_by_user_id"],
        ["id"],
    )
    op.add_column(
        "user",
        sa.Column("is_admin", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.alter_column("user", "is_admin", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("user", "is_admin")
    op.drop_constraint("fk_partner_reviewed_by_user_id_user", "partner", type_="foreignkey")
    op.drop_column("partner", "reviewed_by_user_id")
    op.drop_column("partner", "reviewed_at")
    op.drop_column("partner", "review_note")
    op.drop_column("partner", "status")
    partner_status.drop(op.get_bind(), checkfirst=True)
