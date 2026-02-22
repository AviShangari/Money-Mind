"""Add statement_type to bank_statements, source and transaction_type to transactions

Revision ID: c4d5e6f7a8b9
Revises: 5b134bc36a43
Create Date: 2026-02-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = '5b134bc36a43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add statement_type to bank_statements (default 'chequing' for all existing records)
    op.add_column('bank_statements',
        sa.Column('statement_type', sa.String(), nullable=False, server_default='chequing'))

    # Add source and transaction_type to transactions (nullable for backward compat)
    op.add_column('transactions',
        sa.Column('source', sa.String(), nullable=True))
    op.add_column('transactions',
        sa.Column('transaction_type', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'transaction_type')
    op.drop_column('transactions', 'source')
    op.drop_column('bank_statements', 'statement_type')
