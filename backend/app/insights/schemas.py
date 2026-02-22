from pydantic import BaseModel
from decimal import Decimal


class LargestExpense(BaseModel):
    description: str
    amount: Decimal  # positive value


class MonthlySummary(BaseModel):
    month: str                              # "YYYY-MM"
    total_spending: Decimal                 # absolute value (positive)
    total_income: Decimal | None            # None when no chequing data exists for the month
    net_cash_flow: Decimal | None           # None when income is unavailable
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


class MonthlyBreakdown(BaseModel):
    month: str                              # "YYYY-MM"
    label: str                              # "Jan '25"
    spending_by_category: dict[str, float]


class CategoryBreakdownResponse(BaseModel):
    months: list[MonthlyBreakdown]          # newest first
    average_by_category: dict[str, float]
