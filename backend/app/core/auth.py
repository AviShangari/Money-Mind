from fastapi import Request, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.sessions.service import get_session
from app.users.service import get_user_by_id

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    # 1. Extract session_id cookie
    session_id = request.cookies.get("session_id")

    if not session_id:
        return None  # User is not logged in

    # 2. Look up session from DB
    session = get_session(db, session_id)
    if not session:
        return None  # Invalid or expired session

    # 3. Load user from session
    user = get_user_by_id(db, session.user_id)
    return user
