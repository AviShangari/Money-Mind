"""
SQLAlchemy model for the ml_models table.

Tracks trained ML categorizer models per user, including path to joblib file,
accuracy, version, and when the model was last trained.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey

from app.database.base import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    model_type  = Column(String, nullable=False)          # 'lightgbm' | 'logistic_regression'
    version     = Column(Integer, nullable=False, default=1)
    accuracy    = Column(Float, nullable=True)
    trained_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    path        = Column(String, nullable=False)           # relative path to .pkl file
