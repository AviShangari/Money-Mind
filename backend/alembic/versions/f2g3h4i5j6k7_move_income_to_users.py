"""move income fields from user_settings to users table

Revision ID: f2g3h4i5j6k7
Revises: e1f2a3b4c5d6
Create Date: 2026-02-22 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2g3h4i5j6k7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add income columns directly to users
    op.add_column('users', sa.Column('base_income', sa.Numeric(10, 2), nullable=True))
    op.add_column('users', sa.Column('side_income', sa.Numeric(10, 2), nullable=True))
    op.add_column('users', sa.Column('income_updated_at', sa.DateTime(), nullable=True))

    # 2. Copy existing data from user_settings → users
    op.execute(
        """
        UPDATE users
        SET base_income = us.base_income,
            side_income = us.side_income
        FROM user_settings us
        WHERE us.user_id = users.id
        """
    )

    # 3. Drop the now-redundant user_settings table
    op.drop_index('ix_user_settings_id', table_name='user_settings')
    op.drop_table('user_settings')


def downgrade() -> None:
    # Recreate user_settings
    op.create_table(
        'user_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('base_income', sa.Numeric(10, 2), nullable=True),
        sa.Column('side_income', sa.Numeric(10, 2), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_user_settings_id', 'user_settings', ['id'], unique=False)

    # Move data back
    op.execute(
        """
        INSERT INTO user_settings (user_id, base_income, side_income)
        SELECT id, base_income, side_income FROM users
        WHERE base_income IS NOT NULL OR side_income IS NOT NULL
        """
    )

    # Remove columns from users
    op.drop_column('users', 'income_updated_at')
    op.drop_column('users', 'side_income')
    op.drop_column('users', 'base_income')
