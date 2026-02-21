from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.budgets.schemas import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatusResponse
from app.budgets.service import (
    create_budget,
    get_budgets,
    get_budget_by_id,
    update_budget,
    delete_budget,
    get_budgets_status
)

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.post("", response_model=BudgetResponse)
def add_budget(
    budget_in: BudgetCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    budget = create_budget(db, user_id=current_user.id, budget_data=budget_in)
    if not budget:
        raise HTTPException(status_code=400, detail="Budget limit for this category and month already exists. Consider updating it instead.")
    return budget


@router.get("", response_model=list[BudgetResponse])
def read_budgets(
    month: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    return get_budgets(db, user_id=current_user.id, month=month)


@router.get("/status", response_model=list[BudgetStatusResponse])
def read_budgets_status(
    month: str | None = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        return get_budgets_status(db, user_id=current_user.id, month=month)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{budget_id}", response_model=BudgetResponse)
def edit_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    budget = get_budget_by_id(db, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    if budget.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this budget")
        
    return update_budget(db, budget=budget, update_data=budget_in)


@router.delete("/{budget_id}", status_code=204)
def remove_budget(
    budget_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    budget = get_budget_by_id(db, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    if budget.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this budget")
        
    delete_budget(db, budget=budget)
    return None
