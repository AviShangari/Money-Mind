from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class UserBase(BaseModel):
    email: str
    full_name: str | None = None
    picture_url: str | None = None


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True


class IncomeResponse(BaseModel):
    base_income: Decimal | None = None
    side_income: Decimal | None = None
    income_updated_at: datetime | None = None

    class Config:
        from_attributes = True


class IncomeUpdate(BaseModel):
    base_income: Decimal | None = None
    side_income: Decimal | None = None
