import os
import uuid
import hashlib
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.dependencies import get_db

from app.transactions.parser.extract import extract_text_from_pdf
from app.transactions.parser.detector import detect_bank_from_text, detect_year_from_text
from app.transactions.parser.parse_td import extract_transactions_from_td_text
from app.transactions.parser.parse_rbc import extract_transactions_from_rbc_text
from app.categorization.service import categorize_with_overrides, store_category_override
from app.transactions.service import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
)
from app.transactions.schemas import (
    TransactionUpdate,
    TransactionPreview,
    TransactionConfirmRequest,
)
from app.bank_statements.service import get_statement_by_hash, create_statement_record

router = APIRouter(prefix="/transactions", tags=["transactions"])

UPLOAD_DIR = "uploaded_statements"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=list[TransactionPreview])
async def upload_statement(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF statements are supported")

    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    if get_statement_by_hash(db, user_id=current_user.id, file_hash=file_hash):
        raise HTTPException(
            status_code=409,
            detail="This statement has already been uploaded.",
        )

    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    with open(file_path, "wb") as buffer:
        buffer.write(file_bytes)

    try:
        raw_text = extract_text_from_pdf(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract PDF text: {e}")

    bank = detect_bank_from_text(raw_text)
    if not bank:
        raise HTTPException(
            status_code=400,
            detail="Could not detect bank from statement. Please select your bank manually.",
        )

    year = detect_year_from_text(raw_text)
    if not year:
        from datetime import datetime
        year = datetime.now().year

    try:
        if bank == "TD":
            parsed_transactions = extract_transactions_from_td_text(raw_text, year)
        elif bank == "RBC":
            parsed_transactions = extract_transactions_from_rbc_text(raw_text, year)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported bank parser for: {bank}")
    except NotImplementedError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse transactions: {e}")

    # Record the file hash so re-uploads of the same statement are rejected,
    # even if the user never confirms the transactions.
    create_statement_record(
        db=db,
        user_id=current_user.id,
        file_hash=file_hash,
        filename=file.filename,
    )

    # Build preview — no transaction DB writes yet
    preview: list[TransactionPreview] = []
    for txn in parsed_transactions:
        category, category_source, confidence = categorize_with_overrides(
            db=db,
            user_id=current_user.id,
            description=txn["description"],
        )
        preview.append(
            TransactionPreview(
                id=None,
                date=txn["date"],
                description=txn["description"],
                amount=txn["amount"],
                category=category,
                category_source=category_source,
                confidence=confidence,
            )
        )

    return preview


@router.post("/confirm")
def confirm_transactions(
    payload: TransactionConfirmRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    inserted = 0
    skipped = 0

    for item in payload.transactions:
        # Persist manual category changes as overrides so future transactions
        # with matching descriptions are auto-categorized the same way.
        if item.category_source == "manual":
            store_category_override(
                db=db,
                user_id=current_user.id,
                description_pattern=item.description,
                category=item.category,
            )

        saved = create_transaction(
            db=db,
            user_id=current_user.id,
            date=item.date,
            description=item.description,
            amount=item.amount,
            category=item.category,
            category_source=item.category_source,
        )
        if saved is None:
            skipped += 1
        else:
            inserted += 1

    return {
        "message": "Transactions saved successfully",
        "transactions_created": inserted,
        "transactions_skipped": skipped,
    }


@router.get("")
def list_transactions(
    month: int | None = None,
    year: int | None = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_transactions(db, user_id=current_user.id, month=month, year=year)


@router.get("/{txn_id}")
def get_transaction(
    txn_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    txn = get_transaction_by_id(db, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return txn


@router.put("/{txn_id}")
def edit_transaction(
    txn_id: int,
    payload: TransactionUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    txn = get_transaction_by_id(db, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return update_transaction(
        db, txn, amount=payload.amount, description=payload.description, category=payload.category
    )


@router.delete("/{txn_id}", status_code=204)
def remove_transaction(
    txn_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    txn = get_transaction_by_id(db, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    delete_transaction(db, txn)
