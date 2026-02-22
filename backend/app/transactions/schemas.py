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
    source: Optional[str] = None            # 'chequing' or 'credit_card'
    transaction_type: Optional[str] = None  # 'purchase', 'payment', 'cc_payment', 'refund', etc.

    class Config:
        from_attributes = True


class TransactionConfirmItem(BaseModel):
    date: date
    description: str
    amount: Decimal
    category: str
    category_source: str
    source: Optional[str] = None
    transaction_type: Optional[str] = None
    transaction_type_source: Optional[str] = None  # 'manual' when user overrode the type


class TransactionConfirmRequest(BaseModel):
    transactions: list[TransactionConfirmItem]
