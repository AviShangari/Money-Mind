from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    picture_url = Column(String, nullable=True)

    transactions = relationship("Transaction", back_populates="user")
    bank_statements = relationship("BankStatement", back_populates="user")
    category_overrides = relationship("CategoryOverride", back_populates="user")
    budgets = relationship("Budget", back_populates="user")

