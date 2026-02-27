"""
ML endpoints:
  POST /ml/retrain  — trains or retrains the user's model
  GET  /ml/status   — returns model metadata for the current user
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.dependencies import get_db
from app.ml import categorizer
from app.ml.schemas import RetrainResponse, MLStatusResponse

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/retrain", response_model=RetrainResponse)
def retrain_model(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Train (or retrain) the ML categorization model for the current user.

    Requires at least 20 high-confidence or manually corrected transactions.
    Returns accuracy metrics on success, or a 'more data needed' message.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = categorizer.train_model(db, current_user.id)
    return RetrainResponse(**result)


@router.get("/status", response_model=MLStatusResponse)
def model_status(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Return metadata about the current user's trained ML model, if any."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    status = categorizer.get_status(db, current_user.id)
    return MLStatusResponse(**status)
