from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RetrainResponse(BaseModel):
    success: bool
    message: str
    model_type: Optional[str] = None
    accuracy: Optional[float] = None
    version: Optional[int] = None
    trained_at: Optional[datetime] = None


class MLStatusResponse(BaseModel):
    model_exists: bool
    model_type: Optional[str] = None
    version: Optional[int] = None
    accuracy: Optional[float] = None
    trained_at: Optional[datetime] = None

    class Config:
        from_attributes = True
