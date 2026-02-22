"""
Shared SQLAlchemy filter expressions for spending and income queries.

All modules that aggregate transaction data (insights, budgets, etc.) should
import from here so the business logic is defined exactly once.

Sign convention stored in the DB:
  negative amount  →  spending (purchase, fee, cc_payment out)
  positive amount  →  income / credit received
"""

from sqlalchemy import func, and_, or_, extract
from sqlalchemy.orm import Session

from app.transactions.models import Transaction


def spending_filter():
    """
    Transactions that count as total spending:
      - transaction_type = 'purchase'  (from any source)
      - transaction_type = 'fee'       (from any source)

    Explicitly excluded:
      - 'cc_payment'  — same money moving between accounts; counted once via CC purchases
      - 'refund'      — money returned; not an expense
      - 'income'      — not spending
      - 'transfer'    — neutral movement
    """
    return Transaction.transaction_type.in_(["purchase", "fee"])


def category_spending_filter():
    """
    Transactions that count toward per-category spending breakdowns and budget usage.
    Fees are excluded from category charts because they belong to no user-defined category.
    """
    return Transaction.transaction_type == "purchase"


def income_filter():
    """
    Income = chequing (or legacy null-source) transactions tagged 'income'.
    CC credits / refunds / payments-received are never counted as income.
    """
    chequing_like = or_(Transaction.source == "chequing", Transaction.source == None)  # noqa: E711
    return and_(Transaction.transaction_type == "income", chequing_like)


def user_has_cc_data(db: Session, user_id: int) -> bool:
    """Return True if the user has any credit_card source transactions."""
    count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == user_id, Transaction.source == "credit_card")
        .scalar()
    )
    return (count or 0) > 0


def month_has_chequing(db: Session, user_id: int, year: int, month: int) -> bool:
    """
    Return True if the user has any chequing (or legacy null-source) transactions
    for the given calendar month.  When False, income and net cash flow are
    undefined and should be returned as None rather than misleading zeros.
    """
    chequing_like = or_(Transaction.source == "chequing", Transaction.source == None)  # noqa: E711
    count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == user_id,
            extract("year", Transaction.date) == year,
            extract("month", Transaction.date) == month,
            chequing_like,
        )
        .scalar()
    )
    return (count or 0) > 0
