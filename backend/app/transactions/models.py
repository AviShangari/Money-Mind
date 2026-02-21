from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Basic transaction fields
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String, nullable=False)
    category_source = Column(String, nullable=False, server_default="")

    # Relationship to user
    user = relationship("User", back_populates="transactions")

    __table_args__ = (
        UniqueConstraint("user_id", "date", "description", "amount", name="uq_user_transaction"),
    )