"""create debts table

Revision ID: h5i6j7k8l9m0
Revises: g4h5i6j7k8l9
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa

revision = 'h5i6j7k8l9m0'
down_revision = 'g4h5i6j7k8l9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'debts',
        sa.Column('id',              sa.Integer(),     nullable=False),
        sa.Column('user_id',         sa.Integer(),     nullable=False),
        sa.Column('name',            sa.String(),      nullable=False),
        sa.Column('debt_type',       sa.String(),      nullable=False),
        sa.Column('balance',         sa.Numeric(10, 2), nullable=False),
        sa.Column('interest_rate',   sa.Numeric(5, 2),  nullable=False),
        sa.Column('minimum_payment', sa.Numeric(10, 2), nullable=False),
        sa.Column('due_date',        sa.Integer(),     nullable=True),
        sa.Column('created_at',      sa.DateTime(),    nullable=False),
        sa.Column('updated_at',      sa.DateTime(),    nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_debts_id',      'debts', ['id'],      unique=False)
    op.create_index('ix_debts_user_id', 'debts', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_debts_user_id', table_name='debts')
    op.drop_index('ix_debts_id',      table_name='debts')
    op.drop_table('debts')
