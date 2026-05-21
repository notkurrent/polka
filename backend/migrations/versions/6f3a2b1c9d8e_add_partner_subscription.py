"""add_partner_subscription

Revision ID: 6f3a2b1c9d8e
Revises: 2a6c8f1d9b3e
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6f3a2b1c9d8e"
down_revision: Union[str, Sequence[str], None] = "2a6c8f1d9b3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


subscription_plan = sa.Enum("FREE", "PRO", name="subscriptionplan")
subscription_status = sa.Enum("FREE", "ACTIVE", "EXPIRED", "SUSPENDED", name="subscriptionstatus")


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    subscription_plan.create(bind, checkfirst=True)
    subscription_status.create(bind, checkfirst=True)

    op.add_column(
        "partner",
        sa.Column("plan", subscription_plan, server_default="FREE", nullable=False),
    )
    op.add_column(
        "partner",
        sa.Column("subscription_status", subscription_status, server_default="FREE", nullable=False),
    )
    op.add_column(
        "partner",
        sa.Column("subscription_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("partner", "plan", server_default=None)
    op.alter_column("partner", "subscription_status", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("partner", "subscription_expires_at")
    op.drop_column("partner", "subscription_status")
    op.drop_column("partner", "plan")

    bind = op.get_bind()
    subscription_status.drop(bind, checkfirst=True)
    subscription_plan.drop(bind, checkfirst=True)
