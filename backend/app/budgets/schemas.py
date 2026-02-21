from pydantic import BaseModel, Field
from decimal import Decimal

class BudgetBase(BaseModel):
    category: str
    monthly_limit: Decimal
    month: str = Field(..., description="Month in YYYY-MM format")

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monthly_limit: Decimal

class BudgetResponse(BudgetBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class BudgetStatusResponse(BudgetResponse):
    current_spending: Decimal
    percentage_used: float
    over_budget: bool
