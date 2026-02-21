"""add category_source to transactions

Revision ID: f2a3b4c5d6e7
Revises: e9b2c1f3a4d5
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e9b2c1f3a4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('category_source', sa.String(), nullable=False, server_default=''),
    )


def downgrade() -> None:
    op.drop_column('transactions', 'category_source')
