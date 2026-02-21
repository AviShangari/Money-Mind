"""create bank_statements table

Revision ID: d7a4f8e1c2b3
Revises: c3f1e2d4b5a6
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7a4f8e1c2b3'
down_revision: Union[str, Sequence[str], None] = 'c3f1e2d4b5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'bank_statements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('file_hash', sa.String(length=64), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'file_hash', name='uq_user_file_hash'),
    )
    op.create_index(op.f('ix_bank_statements_id'), 'bank_statements', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bank_statements_id'), table_name='bank_statements')
    op.drop_table('bank_statements')
