from sqlalchemy.orm import Session
from app.bank_statements.models import BankStatement


def get_statement_by_hash(db: Session, user_id: int, file_hash: str) -> BankStatement | None:
    return db.query(BankStatement).filter_by(user_id=user_id, file_hash=file_hash).first()


def create_statement_record(db: Session, user_id: int, file_hash: str, filename: str) -> BankStatement:
    record = BankStatement(user_id=user_id, file_hash=file_hash, filename=filename)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
