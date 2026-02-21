from pydantic import BaseModel
from decimal import Decimal
from datetime import date
from typing import Optional


class TransactionUpdate(BaseModel):
    amount: Decimal | None = None
    description: str | None = None
    category: str | None = None


class TransactionPreview(BaseModel):
    id: Optional[int] = None
    date: date
    description: str
    amount: Decimal
    category: str
    category_source: str
    confidence: float

    class Config:
        from_attributes = True


class TransactionConfirmItem(BaseModel):
    date: date
    description: str
    amount: Decimal
    category: str
    category_source: str


class TransactionConfirmRequest(BaseModel):
    transactions: list[TransactionConfirmItem]
