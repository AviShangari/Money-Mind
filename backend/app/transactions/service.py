from app.transactions.models import Transaction
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import extract
from datetime import date
from decimal import Decimal


def get_transactions(db: Session, user_id: int, month: int | None = None, year: int | None = None) -> list[Transaction]:
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if month is not None:
        query = query.filter(extract("month", Transaction.date) == month)
    if year is not None:
        query = query.filter(extract("year", Transaction.date) == year)
    return query.order_by(Transaction.date.desc()).all()


def get_transaction_by_id(db: Session, txn_id: int) -> Transaction | None:
    return db.query(Transaction).filter(Transaction.id == txn_id).first()


def update_transaction(
    db: Session,
    txn: Transaction,
    amount: Decimal | None = None,
    description: str | None = None,
    category: str | None = None,
) -> Transaction:
    if amount is not None:
        txn.amount = amount
    if description is not None:
        txn.description = description
    if category is not None:
        txn.category = category
    db.commit()
    db.refresh(txn)
    return txn


def delete_transaction(db: Session, txn: Transaction) -> None:
    db.delete(txn)
    db.commit()


def create_transaction(db: Session, user_id: int, date: date, description: str, amount: Decimal, category: str = "", category_source: str = "", source: str | None = None, transaction_type: str | None = None) -> Transaction | None:
    txn = Transaction(
        user_id=user_id,
        date=date,
        description=description,
        amount=amount,
        category=category,
        category_source=category_source,
        source=source,
        transaction_type=transaction_type,
    )

    try:
        db.add(txn)
        db.commit()
        db.refresh(txn)
        return txn
    except IntegrityError:
        db.rollback()
        return None