from datetime import datetime

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database.base import Base


class Debt(Base):
    __tablename__ = "debts"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    name            = Column(String, nullable=False)        # e.g. "TD Visa", "Car Loan"
    debt_type       = Column(String, nullable=False)        # see DEBT_TYPES
    balance         = Column(Numeric(10, 2), nullable=False)
    interest_rate   = Column(Numeric(5,  2), nullable=False)  # annual %
    minimum_payment = Column(Numeric(10, 2), nullable=False)
    due_date        = Column(Integer, nullable=True)          # day of month (1–31)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)

    # Statement auto-update fields
    last_statement_balance = Column(Numeric(10, 2), nullable=True)
    last_verified_at       = Column(DateTime, nullable=True)
    last_manual_update_at  = Column(DateTime, nullable=True)
    linked_statement_bank  = Column(String, nullable=True)  # e.g. "TD", "RBC"

    user = relationship("User", back_populates="debts")


DEBT_TYPES = {
    "credit_card",
    "loan",
    "line_of_credit",
    "mortgage",
    "student_loan",
    "other",
}
