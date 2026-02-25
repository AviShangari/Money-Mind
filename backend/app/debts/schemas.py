from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

DebtType = Literal[
    "credit_card",
    "loan",
    "line_of_credit",
    "mortgage",
    "student_loan",
    "other",
]

PayoffStrategy = Literal["avalanche", "snowball"]


# ── CRUD schemas ──────────────────────────────────────────────────────────────

class DebtCreate(BaseModel):
    name:                 str
    debt_type:            DebtType
    balance:              Decimal = Field(..., ge=0)
    interest_rate:        Decimal = Field(..., ge=0, le=100)
    minimum_payment:      Decimal = Field(..., ge=0)
    due_date:             int | None = Field(None, ge=1, le=31)
    linked_statement_bank: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be empty")
        return v.strip()


class DebtUpdate(BaseModel):
    name:                 str | None = None
    debt_type:            DebtType | None = None
    balance:              Decimal | None = Field(None, ge=0)
    interest_rate:        Decimal | None = Field(None, ge=0, le=100)
    minimum_payment:      Decimal | None = Field(None, ge=0)
    due_date:             int | None = Field(None, ge=1, le=31)
    linked_statement_bank: str | None = None


class DebtResponse(BaseModel):
    id:                    int
    user_id:               int
    name:                  str
    debt_type:             str
    balance:               Decimal
    interest_rate:         Decimal
    minimum_payment:       Decimal
    due_date:              int | None
    created_at:            datetime
    updated_at:            datetime
    last_statement_balance: Decimal | None = None
    last_verified_at:      datetime | None = None
    last_manual_update_at: datetime | None = None
    linked_statement_bank: str | None = None

    class Config:
        from_attributes = True


# ── Payoff schemas ────────────────────────────────────────────────────────────

class MonthlyBalance(BaseModel):
    month:   int      # 1-based month number from today
    date:    str      # "YYYY-MM"
    balance: Decimal


class DebtPayoffDetail(BaseModel):
    debt_id:          int
    name:             str
    original_balance: Decimal
    interest_rate:    Decimal
    months_to_payoff: int | None   # None if not paid within projection cap
    payoff_date:      str | None   # "YYYY-MM"
    total_interest:   Decimal
    order:            int          # 1 = paid off first
    monthly_balances: list[MonthlyBalance]


class MonthlyProjection(BaseModel):
    month:         int
    date:          str
    total_balance: Decimal
    breakdown:     dict[str, Decimal]  # debt name → balance


class PayoffResponse(BaseModel):
    strategy:            str
    extra_payment:       Decimal
    total_months:        int | None
    debt_free_date:      str | None
    total_interest_paid: Decimal
    payoff_order:        list[DebtPayoffDetail]
    monthly_projection:  list[MonthlyProjection]


# ── Summary schema ────────────────────────────────────────────────────────────

class DebtSummary(BaseModel):
    total_debt:                     Decimal
    debt_count:                     int
    total_minimum_payments:         Decimal
    weighted_average_interest_rate: Decimal | None
    avalanche_months:               int | None
    snowball_months:                int | None
    debt_free_date_avalanche:       str | None
    debt_free_date_snowball:        str | None


# ── Payment / auto-update schemas ─────────────────────────────────────────────

class DebtPaymentRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)


class AutoUpdateFromStatementRequest(BaseModel):
    statement_id: int


class AutoUpdateResult(BaseModel):
    updated:      bool
    debt_name:    str | None = None
    new_balance:  Decimal | None = None
    reason:       str | None = None


# ── Lightweight list schema ───────────────────────────────────────────────────

class DebtSimpleResponse(BaseModel):
    id:   int
    name: str

    class Config:
        from_attributes = True


# ── Due-soon schema ───────────────────────────────────────────────────────────

class DueSoonDebtResponse(BaseModel):
    id:                   int
    name:                 str
    debt_type:            str
    balance:              Decimal
    minimum_payment:      Decimal
    due_date:             int
    days_until_due:       int
    last_manual_update_at: datetime | None = None

    class Config:
        from_attributes = True
