from sqlalchemy.orm import Session
from app.users.models import User

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, email: str, full_name: str | None, picture_url: str | None):
    new_user = User(
        email=email,
        full_name=full_name,
        picture_url=picture_url
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
