"""create chat_history table

Revision ID: g4h5i6j7k8l9
Revises: f2g3h4i5j6k7
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision: str = 'g4h5i6j7k8l9'
down_revision = 'f2g3h4i5j6k7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'chat_history',
        sa.Column('id',         sa.Integer(),     primary_key=True),
        sa.Column('user_id',    sa.Integer(),     sa.ForeignKey('users.id'), nullable=False),
        sa.Column('message',    sa.Text(),         nullable=False),
        sa.Column('intent',     sa.String(64),     nullable=True),
        sa.Column('response',   sa.Text(),         nullable=False),
        sa.Column('created_at', sa.DateTime(),     nullable=False),
    )
    op.create_index('ix_chat_history_id',      'chat_history', ['id'])
    op.create_index('ix_chat_history_user_id', 'chat_history', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_chat_history_user_id', table_name='chat_history')
    op.drop_index('ix_chat_history_id',      table_name='chat_history')
    op.drop_table('chat_history')
