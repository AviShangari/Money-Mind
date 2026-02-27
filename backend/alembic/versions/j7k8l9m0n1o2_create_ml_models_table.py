"""create ml_models table

Revision ID: j7k8l9m0n1o2
Revises: i6j7k8l9m0n1
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'j7k8l9m0n1o2'
down_revision = 'i6j7k8l9m0n1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ml_models',
        sa.Column('id',         sa.Integer(),  nullable=False, primary_key=True),
        sa.Column('user_id',    sa.Integer(),  nullable=False),
        sa.Column('model_type', sa.String(),   nullable=False),
        sa.Column('version',    sa.Integer(),  nullable=False, default=1),
        sa.Column('accuracy',   sa.Float(),    nullable=True),
        sa.Column('trained_at', sa.DateTime(), nullable=False),
        sa.Column('path',       sa.String(),   nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index('ix_ml_models_user_id', 'ml_models', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_ml_models_user_id', table_name='ml_models')
    op.drop_table('ml_models')
