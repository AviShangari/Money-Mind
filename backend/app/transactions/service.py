from app.transactions.models import Transaction
from sqlalchemy.orm import Session 
from datetime import date

def create_transaction(db: Session, user_id: int, date: date, description: str, amount: float, category: str = ""):
    txn = Transaction(
        user_id=user_id,
        date=date,
        description=description,
        amount=amount,
        category=category
    )

    db.add(txn)
    db.commit()
    db.refresh(txn)

    return txn