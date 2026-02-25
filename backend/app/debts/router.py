from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.debts.schemas import (
    AutoUpdateFromStatementRequest,
    AutoUpdateResult,
    DebtCreate,
    DebtUpdate,
    DebtResponse,
    DebtPaymentRequest,
    DebtSimpleResponse,
    DueSoonDebtResponse,
    DebtSummary,
    PayoffResponse,
)
from app.debts.service import (
    auto_update_from_statement,
    create_debt,
    get_debts,
    get_debt_by_id,
    get_due_soon,
    get_simple_debts,
    update_debt,
    delete_debt,
    get_payoff_plan,
    get_debt_summary,
    record_payment,
)

router = APIRouter(prefix="/debts", tags=["debts"])


# ── Named routes FIRST (before /{debt_id}) ────────────────────────────────────

@router.get("/list-simple", response_model=list[DebtSimpleResponse])
def list_simple(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_simple_debts(db, user_id=current_user.id)


@router.get("/due-soon", response_model=list[DueSoonDebtResponse])
def read_due_soon(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_due_soon(db, user_id=current_user.id)


@router.post("/auto-update-from-statement", response_model=AutoUpdateResult)
def auto_update(
    payload: AutoUpdateFromStatementRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auto_update_from_statement(db, user_id=current_user.id, statement_id=payload.statement_id)


@router.get("/payoff", response_model=PayoffResponse)
def read_payoff(
    strategy:      str     = Query("avalanche", pattern="^(avalanche|snowball)$"),
    extra_payment: Decimal = Query(Decimal("0"), ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_payoff_plan(db, user_id=current_user.id, strategy=strategy, extra_payment=extra_payment)


@router.get("/summary", response_model=DebtSummary)
def read_summary(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_debt_summary(db, user_id=current_user.id)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("", response_model=DebtResponse, status_code=201)
def add_debt(
    debt_in: DebtCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return create_debt(db, user_id=current_user.id, data=debt_in)


@router.get("", response_model=list[DebtResponse])
def list_debts(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_debts(db, user_id=current_user.id)


@router.get("/{debt_id}", response_model=DebtResponse)
def read_debt(
    debt_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    debt = get_debt_by_id(db, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return debt


@router.put("/{debt_id}", response_model=DebtResponse)
def edit_debt(
    debt_id: int,
    debt_in: DebtUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    debt = get_debt_by_id(db, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return update_debt(db, debt=debt, data=debt_in)


@router.delete("/{debt_id}", status_code=204)
def remove_debt(
    debt_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    debt = get_debt_by_id(db, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    delete_debt(db, debt=debt)
    return None


@router.post("/{debt_id}/payment", response_model=DebtResponse)
def make_payment(
    debt_id: int,
    payload: DebtPaymentRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    debt = get_debt_by_id(db, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return record_payment(db, debt=debt, amount=payload.amount, user_id=current_user.id)
