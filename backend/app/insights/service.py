from decimal import Decimal
from datetime import date

from sqlalchemy import func, extract, Numeric, literal
from sqlalchemy.orm import Session

from app.transactions.models import Transaction
from app.transactions.filters import (
    spending_filter,
    category_spending_filter,
    income_filter,
    month_has_chequing,
)


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

    Spending  = transaction_type IN ('purchase', 'fee')
    Income    = transaction_type = 'income' AND chequing source
    Categories = transaction_type = 'purchase' only (fees excluded from breakdown)

    income / net_cash_flow are None when no chequing data exists for the month.
    """
    spend_f  = spending_filter()
    income_f = income_filter()
    cat_f    = category_spending_filter()

    # ── Common month filter ──────────────────────────────────────────────────
    def _mf(q):
        return q.filter(
            Transaction.user_id == user_id,
            extract("year",  Transaction.date) == year,
            extract("month", Transaction.date) == month,
        )

    # ── Total spending (purchases + fees) ────────────────────────────────────
    total_spending: Decimal = _mf(
        db.query(_coalesce_zero(-func.sum(Transaction.amount)))
        .filter(spend_f)
    ).scalar()

    # ── Total income & net cash flow ──────────────────────────────────────────
    # Income is only meaningful when the user has chequing data for this month.
    if month_has_chequing(db, user_id, year, month):
        total_income: Decimal | None = _mf(
            db.query(_coalesce_zero(func.sum(Transaction.amount)))
            .filter(income_f)
        ).scalar()
        net_cash_flow: Decimal | None = total_income - total_spending
    else:
        total_income = None
        net_cash_flow = None

    # ── Transaction count (all) ───────────────────────────────────────────────
    transaction_count: int = _mf(
        db.query(func.count(Transaction.id))
    ).scalar()

    # ── Spending transaction count (purchases only) ────────────────────────────
    spending_count: int = _mf(
        db.query(func.count(Transaction.id))
        .filter(cat_f)
    ).scalar()

    # ── Spending by category (purchases only) ────────────────────────────────
    cat_rows = _mf(
        db.query(
            Transaction.category,
            (-func.sum(Transaction.amount)).label("total"),
        ).filter(cat_f)
    ).group_by(Transaction.category).all()

    spending_by_category: dict[str, Decimal] = {
        row.category: row.total for row in cat_rows
    }

    # ── Largest single expense (purchases only) ───────────────────────────────
    largest_row = _mf(
        db.query(Transaction.description, Transaction.amount)
        .filter(cat_f)
        .order_by(Transaction.amount)  # most negative first
    ).first()

    largest_expense = (
        {"description": largest_row.description, "amount": -largest_row.amount}
        if largest_row else None
    )

    # ── Previous-month spending for comparison ────────────────────────────────
    py, pm = _prior_month(year, month)
    prior_spending: Decimal = (
        db.query(_coalesce_zero(-func.sum(Transaction.amount)))
        .filter(
            Transaction.user_id == user_id,
            extract("year",  Transaction.date) == py,
            extract("month", Transaction.date) == pm,
            spend_f,
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
        "net_cash_flow": net_cash_flow,
        "spending_by_category": spending_by_category,
        "transaction_count": transaction_count,
        "spending_count": spending_count,
        "largest_expense": largest_expense,
        "previous_month_comparison": pct_change,
    }


def get_monthly_category_breakdown(db: Session, user_id: int) -> dict:
    """
    Return spending-by-category (purchases only) for every calendar month the
    user has data, sorted newest → oldest, plus an average across all months.

    Result shape:
        {
            "months": [
                {"month": "2025-01", "label": "Jan '25", "spending_by_category": {...}},
                ...
            ],
            "average_by_category": {"Food & Dining": 450.0, ...},
        }
    """
    cat_f = category_spending_filter()

    # Single query: all purchase rows grouped by year, month, category
    rows = (
        db.query(
            extract("year",  Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
            Transaction.category,
            (-func.sum(Transaction.amount)).label("total"),
        )
        .filter(Transaction.user_id == user_id, cat_f)
        .group_by(
            extract("year",  Transaction.date),
            extract("month", Transaction.date),
            Transaction.category,
        )
        .order_by(
            extract("year",  Transaction.date).desc(),
            extract("month", Transaction.date).desc(),
        )
        .all()
    )

    # Collect months in order (newest first) and their category totals
    months_ordered: list[tuple[int, int]] = []
    data: dict[tuple[int, int], dict[str, float]] = {}

    for row in rows:
        key = (int(row.yr), int(row.mo))
        if key not in data:
            months_ordered.append(key)
            data[key] = {}
        data[key][row.category] = float(row.total)

    # Build per-month output
    months_out = []
    for yr, mo in months_ordered:
        label = date(yr, mo, 1).strftime("%b '%y")
        months_out.append({
            "month": f"{yr:04d}-{mo:02d}",
            "label": label,
            "spending_by_category": data[(yr, mo)],
        })

    # Compute average across all months (sum / number of months with that category)
    if months_out:
        n = len(months_out)
        category_sums: dict[str, float] = {}
        for entry in months_out:
            for cat, val in entry["spending_by_category"].items():
                category_sums[cat] = category_sums.get(cat, 0.0) + val
        average_by_category = {cat: total / n for cat, total in category_sums.items()}
    else:
        average_by_category = {}

    return {
        "months": months_out,
        "average_by_category": average_by_category,
    }


def get_trend(db: Session, user_id: int) -> list[dict]:
    """
    Return monthly spending totals (purchases + fees) for the last 6 months,
    ordered oldest → newest.
    """
    ref_year, ref_month = latest_month_with_data(db, user_id)
    cutoff = _month_cutoff_from(ref_year, ref_month, months_back=5)

    spend_f = spending_filter()

    rows = (
        db.query(
            extract("year",  Transaction.date).label("yr"),
            extract("month", Transaction.date).label("mo"),
            (-func.sum(Transaction.amount)).label("spending"),
        )
        .filter(
            Transaction.user_id == user_id,
            spend_f,
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

    return [
        {
            "month":    date(int(row.yr), int(row.mo), 1).strftime("%b '%y"),
            "spending": row.spending,
        }
        for row in rows
    ]
