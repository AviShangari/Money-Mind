"""add unique constraint to transactions

Revision ID: e9b2c1f3a4d5
Revises: d7a4f8e1c2b3
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9b2c1f3a4d5'
down_revision: Union[str, Sequence[str], None] = 'd7a4f8e1c2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_user_transaction',
        'transactions',
        ['user_id', 'date', 'description', 'amount'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_user_transaction', 'transactions', type_='unique')
