from pydantic import BaseModel
from decimal import Decimal


class LargestExpense(BaseModel):
    description: str
    amount: Decimal  # positive value


class MonthlySummary(BaseModel):
    month: str                              # "YYYY-MM"
    total_spending: Decimal                 # absolute value (positive)
    total_income: Decimal | None            # None when no income sources exist
    net_cash_flow: Decimal | None           # None when income is unavailable
    cash_flow_estimated: bool = False       # True when derived (in part) from manual income
    spending_by_category: dict[str, Decimal]
    transaction_count: int                  # all transactions in the month
    spending_count: int                     # purchase-only transactions
    largest_expense: LargestExpense | None  # largest single purchase for the month
    previous_month_comparison: float | None  # % change in spending vs prior month
    # Income breakdown
    base_income: Decimal | None = None      # user's manual base salary setting
    side_income: Decimal | None = None      # user's manual side income setting
    transaction_income: Decimal = Decimal("0")  # income from chequing deposits
    # Spending breakdown by source
    cc_spending: Decimal = Decimal("0")         # credit card purchases only
    chequing_spending: Decimal = Decimal("0")   # chequing purchases only
    # Prior month cash flow for trend comparison
    previous_net_cash_flow: Decimal | None = None


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
