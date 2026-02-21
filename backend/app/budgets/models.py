from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    category = Column(String, nullable=False)
    monthly_limit = Column(Numeric(10, 2), nullable=False)
    month = Column(String, nullable=False)  # Format: YYYY-MM

    # Relationship to user
    user = relationship("User", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "category", "month", name="uq_user_budget_month"),
    )
