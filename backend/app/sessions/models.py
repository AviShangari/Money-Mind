import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

from app.database.base import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)

    @staticmethod
    def generate_session_id():
        return uuid.uuid4().hex

    @staticmethod
    def default_expiry():
        return datetime.utcnow() + timedelta(days=7)
