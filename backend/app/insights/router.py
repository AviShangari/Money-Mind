import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.insights import service
from app.insights.schemas import MonthlySummary, SpendingTrend
from app.insights.service import latest_month_with_data

router = APIRouter(prefix="/insights", tags=["insights"])

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _parse_month_param(month: str | None, db, user_id: int) -> tuple[int, int]:
    """
    Parse an optional YYYY-MM string into (year, month_int).
    When None, defaults to the most recent month that has transaction data
    for this user (falls back to current calendar month if no data exists).
    """
    if month is None:
        return latest_month_with_data(db, user_id)
    if not _MONTH_RE.match(month):
        raise HTTPException(
            status_code=422,
            detail="month must be in YYYY-MM format, e.g. 2025-01",
        )
    year_str, month_str = month.split("-")
    return int(year_str), int(month_str)


@router.get("/summary", response_model=MonthlySummary)
def get_summary(
    month: str | None = Query(
        None,
        description="Calendar month to summarise (YYYY-MM). Defaults to the current month.",
        example="2025-01",
    ),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    year, month_int = _parse_month_param(month, db, current_user.id)
    return service.get_summary(db, user_id=current_user.id, year=year, month=month_int)


@router.get("/trend", response_model=SpendingTrend)
def get_trend(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"trend": service.get_trend(db, user_id=current_user.id)}
