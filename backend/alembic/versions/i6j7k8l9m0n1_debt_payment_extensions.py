"""add debt payment extensions

Revision ID: i6j7k8l9m0n1
Revises: h5i6j7k8l9m0
Create Date: 2026-02-23
"""
from alembic import op
import sqlalchemy as sa

revision = 'i6j7k8l9m0n1'
down_revision = 'h5i6j7k8l9m0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── debts: statement tracking + manual update fields ─────────────────────
    op.add_column('debts', sa.Column('last_statement_balance', sa.Numeric(10, 2), nullable=True))
    op.add_column('debts', sa.Column('last_verified_at',       sa.DateTime(),     nullable=True))
    op.add_column('debts', sa.Column('last_manual_update_at',  sa.DateTime(),     nullable=True))
    op.add_column('debts', sa.Column('linked_statement_bank',  sa.String(),       nullable=True))

    # ── transactions: optional link to the debt that was paid ─────────────────
    op.add_column('transactions', sa.Column('debt_payment_link', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_transactions_debt_payment_link',
        'transactions', 'debts',
        ['debt_payment_link'], ['id'],
        ondelete='SET NULL',
    )

    # ── bank_statements: store parsed closing balance + detected bank ─────────
    op.add_column('bank_statements', sa.Column('closing_balance', sa.Numeric(10, 2), nullable=True))
    op.add_column('bank_statements', sa.Column('detected_bank',   sa.String(),       nullable=True))


def downgrade() -> None:
    op.drop_column('bank_statements', 'detected_bank')
    op.drop_column('bank_statements', 'closing_balance')
    op.drop_constraint('fk_transactions_debt_payment_link', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'debt_payment_link')
    op.drop_column('debts', 'linked_statement_bank')
    op.drop_column('debts', 'last_manual_update_at')
    op.drop_column('debts', 'last_verified_at')
    op.drop_column('debts', 'last_statement_balance')
