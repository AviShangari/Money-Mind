from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base


class CategoryOverride(Base):
    __tablename__ = "category_overrides"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description_pattern = Column(String, nullable=False)
    category = Column(String, nullable=False)
    transaction_type = Column(String, nullable=True)   # user-overridden type; None = no override
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="category_overrides")
