from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.users.schemas import IncomeResponse, IncomeUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/income", response_model=IncomeResponse)
def get_income(
    current_user=Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return IncomeResponse(
        base_income=current_user.base_income,
        side_income=current_user.side_income,
        income_updated_at=current_user.income_updated_at,
    )


@router.put("/income", response_model=IncomeResponse)
def update_income(
    payload: IncomeUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    current_user.base_income = payload.base_income
    current_user.side_income = payload.side_income
    current_user.income_updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return IncomeResponse(
        base_income=current_user.base_income,
        side_income=current_user.side_income,
        income_updated_at=current_user.income_updated_at,
    )
