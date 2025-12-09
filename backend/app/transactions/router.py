import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.dependencies import get_db

from app.transactions.parser.extract import extract_text_from_pdf
from app.transactions.parser.parse_td import extract_transactions_from_td_text
from app.transactions.service import create_transaction

router = APIRouter(prefix="/transactions", tags=["transactions"])

UPLOAD_DIR = "uploaded_statements"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_statement(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    db=Depends(get_db)
):
    # 1. Must be logged in
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # 2. Only accept PDF files
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF statements are supported")

    # 3. Save PDF to disk temporarily
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Extract text from PDF using pdfplumber
    try:
        raw_text = extract_text_from_pdf(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract PDF text: {e}")

    # 5. Determine year from filename OR default (for now)
    # For MVP we use the current year or let you pass it manually.
    # Later we will parse the year from the PDF header.
    year = 2025  # TEMP: hard-coded for your sample PDF

    # 6. Parse transactions from TD text
    try:
        parsed_transactions = extract_transactions_from_td_text(raw_text, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse TD transactions: {e}")

    # 7. Store transactions in DB
    inserted_ids = []
    for txn in parsed_transactions:
        saved = create_transaction(
            db=db,
            user_id=current_user.id,
            date=txn["date"],
            description=txn["description"],
            amount=txn["amount"],
        )
        inserted_ids.append(saved.id)

    return {
        "message": "PDF processed successfully",
        "transactions_created": len(inserted_ids),
        "example_transaction": parsed_transactions[0] if parsed_transactions else None
    }
