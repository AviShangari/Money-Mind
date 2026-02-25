from __future__ import annotations

import calendar
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.debts.models import Debt
from app.debts.schemas import (
    AutoUpdateResult,
    DebtCreate,
    DebtUpdate,
    DebtPayoffDetail,
    DebtSimpleResponse,
    DueSoonDebtResponse,
    DebtSummary,
    MonthlyBalance,
    MonthlyProjection,
    PayoffResponse,
)

# ── CRUD helpers ───────────────────────────────────────────────────────────────

def create_debt(db: Session, user_id: int, data: DebtCreate) -> Debt:
    debt = Debt(
        user_id         = user_id,
        name            = data.name,
        debt_type       = data.debt_type,
        balance         = data.balance,
        interest_rate   = data.interest_rate,
        minimum_payment = data.minimum_payment,
        due_date        = data.due_date,
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


def get_debts(db: Session, user_id: int) -> list[Debt]:
    return db.query(Debt).filter(Debt.user_id == user_id).order_by(Debt.created_at).all()


def get_debt_by_id(db: Session, debt_id: int) -> Debt | None:
    return db.query(Debt).filter(Debt.id == debt_id).first()


def update_debt(db: Session, debt: Debt, data: DebtUpdate) -> Debt:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)
    debt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(debt)
    return debt


def delete_debt(db: Session, debt: Debt) -> None:
    db.delete(debt)
    db.commit()


# ── Payoff simulation ──────────────────────────────────────────────────────────

_TWO = Decimal("0.01")
_MAX_MONTHS = 600   # 50 years cap


def _round2(d: Decimal) -> Decimal:
    return d.quantize(_TWO, rounding=ROUND_HALF_UP)


def _month_label(base: date, offset: int) -> str:
    """Return 'YYYY-MM' string for base + offset months."""
    total = base.month - 1 + offset
    year  = base.year + total // 12
    month = total % 12 + 1
    return f"{year:04d}-{month:02d}"


def _simulate_payoff(
    debts: list[Debt],
    strategy: str,
    extra_payment: Decimal,
) -> PayoffResponse:
    """
    Run an avalanche or snowball payoff simulation.

    - avalanche: pay highest-interest first
    - snowball:  pay lowest-balance first

    At each month:
      1. Accrue monthly interest on every remaining balance.
      2. Pay the minimum on every debt (or full balance if smaller).
      3. Apply any freed-up minimum + extra_payment to the priority debt.
      4. Record balances.
    """
    today = date.today()

    # Working copies — keep in sync with schemas
    class _Slot:
        __slots__ = ("debt_id", "name", "balance", "rate_monthly", "min_pay",
                     "original_balance", "interest_rate", "interest_accrued",
                     "paid_off_month", "monthly_balances")

        def __init__(self, d: Debt):
            self.debt_id        = d.id
            self.name           = d.name
            self.balance        = Decimal(str(d.balance))
            self.rate_monthly   = Decimal(str(d.interest_rate)) / 100 / 12
            self.min_pay        = Decimal(str(d.minimum_payment))
            self.original_balance = Decimal(str(d.balance))
            self.interest_rate  = Decimal(str(d.interest_rate))
            self.interest_accrued = Decimal("0")
            self.paid_off_month: int | None = None
            self.monthly_balances: list[MonthlyBalance] = []

    slots = [_Slot(d) for d in debts]

    # Sort priority order once — doesn't change during simulation
    if strategy == "avalanche":
        priority = sorted(slots, key=lambda s: (-s.interest_rate, s.balance))
    else:  # snowball
        priority = sorted(slots, key=lambda s: (s.balance, -s.interest_rate))

    freed_minimums = Decimal("0")  # minimums freed by paid-off debts
    month = 0

    while any(s.balance > 0 for s in slots) and month < _MAX_MONTHS:
        month += 1
        label = _month_label(today, month)

        # 1. Accrue interest
        for s in slots:
            if s.balance > 0:
                interest = _round2(s.balance * s.rate_monthly)
                s.balance += interest
                s.interest_accrued += interest

        # 2. Pay minimums on all active debts
        total_minimum_pool = extra_payment + freed_minimums
        for s in slots:
            if s.balance <= 0:
                continue
            pay = min(s.min_pay, s.balance)
            s.balance -= pay
            s.balance = max(s.balance, Decimal("0"))
            if s.balance == 0 and s.paid_off_month is None:
                freed_minimums += s.min_pay
                s.paid_off_month = month

        # 3. Apply extra pool to priority debt
        pool = total_minimum_pool
        for s in priority:
            if pool <= 0:
                break
            if s.balance <= 0:
                continue
            apply = min(pool, s.balance)
            s.balance -= apply
            pool -= apply
            if s.balance == 0 and s.paid_off_month is None:
                freed_minimums += s.min_pay
                s.paid_off_month = month

        # 4. Record monthly balance snapshot
        for s in slots:
            s.monthly_balances.append(
                MonthlyBalance(
                    month   = month,
                    date    = label,
                    balance = _round2(max(s.balance, Decimal("0"))),
                )
            )

    # ── Build per-debt payoff details ─────────────────────────────────────────
    payoff_order_map: dict[int, int] = {}  # debt_id → order (1=first)
    ordered = sorted(
        (s for s in slots if s.paid_off_month is not None),
        key=lambda s: s.paid_off_month,  # type: ignore[arg-type]
    )
    for rank, s in enumerate(ordered, start=1):
        payoff_order_map[s.debt_id] = rank

    payoff_order: list[DebtPayoffDetail] = []
    for s in slots:
        order = payoff_order_map.get(s.debt_id, len(slots) + 1)
        m2p   = s.paid_off_month
        pd    = _month_label(today, m2p) if m2p else None
        payoff_order.append(
            DebtPayoffDetail(
                debt_id          = s.debt_id,
                name             = s.name,
                original_balance = _round2(s.original_balance),
                interest_rate    = s.interest_rate,
                months_to_payoff = m2p,
                payoff_date      = pd,
                total_interest   = _round2(s.interest_accrued),
                order            = order,
                monthly_balances = s.monthly_balances,
            )
        )
    payoff_order.sort(key=lambda d: d.order)

    # ── Monthly aggregate projection ──────────────────────────────────────────
    monthly_projection: list[MonthlyProjection] = []
    for mo in range(1, month + 1):
        label = _month_label(today, mo)
        breakdown: dict[str, Decimal] = {}
        total_bal = Decimal("0")
        for s in slots:
            bal = s.monthly_balances[mo - 1].balance if mo <= len(s.monthly_balances) else Decimal("0")
            breakdown[s.name] = bal
            total_bal += bal
        monthly_projection.append(
            MonthlyProjection(
                month         = mo,
                date          = label,
                total_balance = _round2(total_bal),
                breakdown     = breakdown,
            )
        )

    total_interest = sum((d.total_interest for d in payoff_order), Decimal("0"))
    all_paid_off   = all(s.paid_off_month is not None for s in slots)
    total_months   = month if all_paid_off else None
    debt_free_date = _month_label(today, month) if all_paid_off else None

    return PayoffResponse(
        strategy            = strategy,
        extra_payment       = extra_payment,
        total_months        = total_months,
        debt_free_date      = debt_free_date,
        total_interest_paid = _round2(total_interest),
        payoff_order        = payoff_order,
        monthly_projection  = monthly_projection,
    )


def get_payoff_plan(
    db: Session,
    user_id: int,
    strategy: str,
    extra_payment: Decimal,
) -> PayoffResponse:
    debts = get_debts(db, user_id)
    if not debts:
        return PayoffResponse(
            strategy            = strategy,
            extra_payment       = extra_payment,
            total_months        = None,
            debt_free_date      = None,
            total_interest_paid = Decimal("0"),
            payoff_order        = [],
            monthly_projection  = [],
        )
    return _simulate_payoff(debts, strategy, extra_payment)


# ── Summary ────────────────────────────────────────────────────────────────────

def get_debt_summary(db: Session, user_id: int) -> DebtSummary:
    debts = get_debts(db, user_id)

    if not debts:
        return DebtSummary(
            total_debt                     = Decimal("0"),
            debt_count                     = 0,
            total_minimum_payments         = Decimal("0"),
            weighted_average_interest_rate = None,
            avalanche_months               = None,
            snowball_months                = None,
            debt_free_date_avalanche       = None,
            debt_free_date_snowball        = None,
        )

    total_debt     = sum(Decimal(str(d.balance)) for d in debts)
    total_min_pay  = sum(Decimal(str(d.minimum_payment)) for d in debts)

    # Weighted average interest rate by balance
    if total_debt > 0:
        weighted_rate = sum(
            Decimal(str(d.balance)) * Decimal(str(d.interest_rate)) for d in debts
        ) / total_debt
        weighted_rate = _round2(weighted_rate)
    else:
        weighted_rate = None

    # Run both strategies with no extra payment for the summary dates
    av = _simulate_payoff(debts, "avalanche", Decimal("0"))
    sn = _simulate_payoff(debts, "snowball",  Decimal("0"))

    return DebtSummary(
        total_debt                     = _round2(total_debt),
        debt_count                     = len(debts),
        total_minimum_payments         = _round2(total_min_pay),
        weighted_average_interest_rate = weighted_rate,
        avalanche_months               = av.total_months,
        snowball_months                = sn.total_months,
        debt_free_date_avalanche       = av.debt_free_date,
        debt_free_date_snowball        = sn.debt_free_date,
    )


# ── Payment recording ──────────────────────────────────────────────────────────

def record_payment(
    db: Session,
    debt: Debt,
    amount: Decimal,
    user_id: int,
) -> Debt:
    """
    Subtract `amount` from the debt balance (floor at 0), record the payment
    timestamp, and create a linked Transaction so due-soon checks can find it.
    """
    from app.transactions.service import create_transaction  # local import avoids circular

    new_balance = max(Decimal(str(debt.balance)) - amount, Decimal("0"))
    debt.balance               = new_balance
    debt.last_manual_update_at = datetime.utcnow()
    db.commit()
    db.refresh(debt)

    # Create a linked transaction (skipped silently on duplicate key)
    create_transaction(
        db=db,
        user_id=user_id,
        date=date.today(),
        description=f"Payment – {debt.name}",
        amount=-amount,         # negative = money out (spending sign convention)
        category="Debt Payment",
        category_source="auto",
        source="chequing",
        transaction_type="debt_payment",
        debt_payment_link=debt.id,
    )

    return debt


# ── Auto-update from statement ─────────────────────────────────────────────────

def auto_update_from_statement(
    db: Session,
    user_id: int,
    statement_id: int,
) -> AutoUpdateResult:
    """
    Find the BankStatement, read its closing_balance and detected_bank, then
    update the matching debt (linked_statement_bank == detected_bank).
    """
    from app.bank_statements.models import BankStatement  # local import avoids circular

    stmt = (
        db.query(BankStatement)
        .filter_by(id=statement_id, user_id=user_id)
        .first()
    )
    if not stmt:
        return AutoUpdateResult(updated=False, reason="Statement not found")
    if stmt.statement_type != "credit_card":
        return AutoUpdateResult(updated=False, reason="Not a credit card statement")
    if stmt.closing_balance is None:
        return AutoUpdateResult(updated=False, reason="Closing balance not detected in statement")
    if not stmt.detected_bank:
        return AutoUpdateResult(updated=False, reason="Bank not detected in statement")

    debt = (
        db.query(Debt)
        .filter_by(user_id=user_id, linked_statement_bank=stmt.detected_bank)
        .first()
    )
    if not debt:
        return AutoUpdateResult(
            updated=False,
            reason=f"No debt linked to bank '{stmt.detected_bank}'",
        )

    new_balance = Decimal(str(stmt.closing_balance))
    debt.last_statement_balance = new_balance
    debt.balance                = new_balance
    debt.last_verified_at       = datetime.utcnow()
    db.commit()
    db.refresh(debt)

    return AutoUpdateResult(
        updated=True,
        debt_name=debt.name,
        new_balance=new_balance,
    )


# ── Simple list (for dropdowns) ────────────────────────────────────────────────

def get_simple_debts(db: Session, user_id: int) -> list[DebtSimpleResponse]:
    debts = db.query(Debt.id, Debt.name).filter(Debt.user_id == user_id).all()
    return [DebtSimpleResponse(id=d.id, name=d.name) for d in debts]


# ── Due-soon list ──────────────────────────────────────────────────────────────

def get_due_soon(db: Session, user_id: int) -> list[DueSoonDebtResponse]:
    """
    Return debts whose due_date falls within the next 3 calendar days and that
    have not yet had a linked payment transaction this month.
    """
    from app.transactions.models import Transaction  # local import avoids circular

    today       = date.today()
    last_day    = calendar.monthrange(today.year, today.month)[1]
    due_soon: list[DueSoonDebtResponse] = []

    debts = (
        db.query(Debt)
        .filter(Debt.user_id == user_id, Debt.due_date.isnot(None))
        .all()
    )

    for debt in debts:
        # Clamp due_date to the last valid day of this month
        effective_due = min(debt.due_date, last_day)
        due_this_month = date(today.year, today.month, effective_due)

        # Within next 3 days OR up to 7 days overdue?
        days_until = (due_this_month - today).days
        if not (-7 <= days_until <= 3):
            continue

        # Has a linked payment transaction been recorded this month?
        paid_this_month = (
            db.query(Transaction)
            .filter(
                Transaction.debt_payment_link == debt.id,
                extract("year",  Transaction.date) == today.year,
                extract("month", Transaction.date) == today.month,
            )
            .first()
        )
        if paid_this_month:
            continue

        due_soon.append(DueSoonDebtResponse(
            id=debt.id,
            name=debt.name,
            debt_type=debt.debt_type,
            balance=debt.balance,
            minimum_payment=debt.minimum_payment,
            due_date=debt.due_date,
            days_until_due=days_until,
            last_manual_update_at=debt.last_manual_update_at,
        ))

    return due_soon
