from datetime import datetime
from sqlalchemy.orm import Session
from app.sessions.models import Session as SessionModel

def create_session(db: Session, user_id: int):
    session = SessionModel(
        session_id=SessionModel.generate_session_id(),
        user_id=user_id,
        expires_at=SessionModel.default_expiry(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_session(db: Session, session_id: str):
    session = (
        db.query(SessionModel)
        .filter(SessionModel.session_id == session_id)
        .first()
    )

    if not session:
        return None

    if session.expires_at < datetime.utcnow():
        return None

    return session
