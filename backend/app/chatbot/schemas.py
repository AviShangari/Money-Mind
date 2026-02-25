from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    intent: str | None
    response: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryItem(BaseModel):
    id: int
    message: str
    intent: str | None
    response: str
    created_at: datetime

    class Config:
        from_attributes = True
