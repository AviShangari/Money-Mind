from pydantic import BaseModel
from decimal import Decimal


class LargestExpense(BaseModel):
    description: str
    amount: Decimal  # positive value


class MonthlySummary(BaseModel):
    month: str                              # "YYYY-MM"
    total_spending: Decimal                 # absolute value (positive)
    total_income: Decimal
    net_cash_flow: Decimal                  # income − spending
    spending_by_category: dict[str, Decimal]
    transaction_count: int                  # all transactions in the month
    spending_count: int                     # debit-only transactions (for avg calculation)
    largest_expense: LargestExpense | None  # largest single debit for the month
    previous_month_comparison: float | None  # % change vs prior month; None if no prior data


class TrendPoint(BaseModel):
    month: str      # "Jan '25"
    spending: Decimal


class SpendingTrend(BaseModel):
    trend: list[TrendPoint]
