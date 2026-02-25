from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class BankStatement(Base):
    __tablename__ = "bank_statements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 hex digest
    filename = Column(String, nullable=False)
    statement_type  = Column(String, nullable=False, server_default="chequing")  # 'chequing' or 'credit_card'
    uploaded_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    closing_balance = Column(Numeric(10, 2), nullable=True)   # parsed from statement
    detected_bank   = Column(String, nullable=True)           # e.g. "TD", "RBC"

    user = relationship("User", back_populates="bank_statements")

    __table_args__ = (
        UniqueConstraint("user_id", "file_hash", name="uq_user_file_hash"),
    )
