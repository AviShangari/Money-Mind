"""alter transaction amount to numeric

Revision ID: c3f1e2d4b5a6
Revises: a44082831d61
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f1e2d4b5a6'
down_revision: Union[str, Sequence[str], None] = 'a44082831d61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'transactions',
        'amount',
        existing_type=sa.Float(),
        type_=sa.Numeric(10, 2),
        existing_nullable=False,
        postgresql_using='amount::numeric(10,2)',
    )


def downgrade() -> None:
    op.alter_column(
        'transactions',
        'amount',
        existing_type=sa.Numeric(10, 2),
        type_=sa.Float(),
        existing_nullable=False,
    )
