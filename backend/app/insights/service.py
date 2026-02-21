from decimal import Decimal
from datetime import date

from sqlalchemy import func, extract, Numeric, literal
from sqlalchemy.orm import Session

from app.transactions.models import Transaction


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _prior_month(year: int, month: int) -> tuple[int, int]:
    """Return (year, month) for the month immediately before the given one."""
    if month == 1:
        return year - 1, 12
    return year, month - 1


def _month_cutoff_from(ref_year: int, ref_month: int, months_back: int) -> date:
    """First day of the month `months_back` months before the reference month."""
    month = ref_month - months_back
    year = ref_year
    while month <= 0:
        month += 12
        year -= 1
    return date(year, month, 1)


def latest_month_with_data(db: Session, user_id: int) -> tuple[int, int]:
    """
    Return (year, month) of the most recent transaction for this user.
    Falls back to the current calendar month if the user has no transactions.
    """
    row = (
        db.query(
            extract("year",  Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
        )
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.date.desc())
        .first()
    )
    if row:
        return int(row.yr), int(row.mo)
    today = date.today()
    return today.year, today.month


def _coalesce_zero(expr):
    """Wrap an aggregate expression so NULL becomes 0."""
    return func.coalesce(expr, literal(Decimal("0"), type_=Numeric(10, 2)))


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------

def get_summary(db: Session, user_id: int, year: int, month: int) -> dict:
    """
    Return aggregated stats for `user_id` scoped to a single calendar month.
    All summations are performed in SQL.
    """
    # ── Common filter fragments ─────────────────────────────────────────────
    def _month_filter(q):
        return q.filter(
            Transaction.user_id == user_id,
            extract("year",  Transaction.date) == year,
            extract("month", Transaction.date) == month,
        )

    # ── Total spending (sum of negative amounts, returned as a positive value)
    total_spending: Decimal = _month_filter(
        db.query(_coalesce_zero(-func.sum(Transaction.amount)))
        .filter(Transaction.amount < 0)
    ).scalar()

    # ── Total income (sum of positive amounts)
    total_income: Decimal = _month_filter(
        db.query(_coalesce_zero(func.sum(Transaction.amount)))
        .filter(Transaction.amount > 0)
    ).scalar()

    # ── Transaction count (all)
    transaction_count: int = _month_filter(
        db.query(func.count(Transaction.id))
    ).scalar()

    # ── Spending transaction count (debits only, used for average)
    spending_count: int = _month_filter(
        db.query(func.count(Transaction.id))
        .filter(Transaction.amount < 0)
    ).scalar()

    # ── Spending by category (positive totals, one row per category)
    cat_rows = _month_filter(
        db.query(
            Transaction.category,
            (-func.sum(Transaction.amount)).label("total"),
        ).filter(Transaction.amount < 0)
    ).group_by(Transaction.category).all()

    spending_by_category: dict[str, Decimal] = {
        row.category: row.total for row in cat_rows
    }

    # ── Largest single debit for the month
    largest_row = _month_filter(
        db.query(Transaction.description, Transaction.amount)
        .filter(Transaction.amount < 0)
        .order_by(Transaction.amount)  # most negative first
    ).first()

    largest_expense = (
        {"description": largest_row.description, "amount": -largest_row.amount}
        if largest_row else None
    )

    # ── Previous-month spending for comparison
    py, pm = _prior_month(year, month)
    prior_spending: Decimal = (
        db.query(_coalesce_zero(-func.sum(Transaction.amount)))
        .filter(
            Transaction.user_id == user_id,
            extract("year",  Transaction.date) == py,
            extract("month", Transaction.date) == pm,
            Transaction.amount < 0,
        )
        .scalar()
    )

    if prior_spending and prior_spending != 0:
        pct_change: float | None = float(
            (total_spending - prior_spending) / prior_spending * 100
        )
    else:
        pct_change = None

    return {
        "month": f"{year:04d}-{month:02d}",
        "total_spending": total_spending,
        "total_income": total_income,
        "net_cash_flow": total_income - total_spending,
        "spending_by_category": spending_by_category,
        "transaction_count": transaction_count,
        "spending_count": spending_count,
        "largest_expense": largest_expense,
        "previous_month_comparison": pct_change,
    }


def get_trend(db: Session, user_id: int) -> list[dict]:
    """
    Return monthly spending totals for the last 6 months, ordered oldest→newest.
    The window is anchored to the most recent month that has data for this user,
    so statements from past years still produce a populated chart.
    Aggregation is done entirely in SQL; only label formatting happens in Python.
    """
    ref_year, ref_month = latest_month_with_data(db, user_id)
    cutoff = _month_cutoff_from(ref_year, ref_month, months_back=5)

    rows = (
        db.query(
            extract("year",  Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
            (-func.sum(Transaction.amount)).label("spending"),
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.amount < 0,
            Transaction.date >= cutoff,
        )
        .group_by(
            extract("year",  Transaction.date),
            extract("month", Transaction.date),
        )
        .order_by(
            extract("year",  Transaction.date),
            extract("month", Transaction.date),
        )
        .all()
    )

    # Convert (yr, mo) floats from SQLite / ints from Postgres → label strings
    return [
        {
            "month":    date(int(row.yr), int(row.mo), 1).strftime("%b '%y"),
            "spending": row.spending,
        }
        for row in rows
    ]
