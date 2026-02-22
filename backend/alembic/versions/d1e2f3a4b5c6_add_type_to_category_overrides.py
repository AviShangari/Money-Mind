"""Add transaction_type column to category_overrides

Revision ID: d1e2f3a4b5c6
Revises: c4d5e6f7a8b9
Create Date: 2026-02-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # nullable so existing override rows are unaffected
    op.add_column(
        'category_overrides',
        sa.Column('transaction_type', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('category_overrides', 'transaction_type')
