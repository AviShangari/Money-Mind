import os
import re
import uuid
import hashlib
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy import or_
from app.core.auth import get_current_user
from app.core.dependencies import get_db

from app.transactions.parser.extract import extract_text_from_pdf
from app.transactions.parser.detector import detect_bank_from_text, detect_year_from_text
from app.transactions.parser.parse_td import extract_transactions_from_td_text
from app.transactions.parser.parse_rbc import extract_transactions_from_rbc_text
# Importing this named function also triggers its module-level self-registration
# into the parser registry, so auto-detection works on the first request.
from app.transactions.parser.td_visa_parser import extract_transactions_from_td_visa_text
from app.transactions.parser.registry import get_parser
from app.categorization.service import (
    categorize_with_overrides,
    store_category_override,
    get_type_override,
    store_type_override,
)
from app.transactions.service import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
)
from app.transactions.models import Transaction
from app.transactions.schemas import (
    TransactionUpdate,
    TransactionPreview,
    TransactionConfirmRequest,
)
from app.bank_statements.models import BankStatement
from app.bank_statements.service import get_statement_by_hash, create_statement_record

router = APIRouter(prefix="/transactions", tags=["transactions"])

UPLOAD_DIR = "uploaded_statements"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Transaction-type detection regexes ───────────────────────────────────────

# Chequing: descriptions that are a credit-card bill payment
_CC_PAYMENT_RE = re.compile(
    r"VISA[\s\-]*PAYMENT"
    r"|MASTERCARD[\s\-]*PAYMENT"
    r"|CC[\s\-]*PAYMENT"
    r"|CREDIT[\s\-]*CARD[\s\-]*PAYMENT"
    r"|PAYMENT[\s\-]*VISA"
    r"|PAYMENT[\s\-]*-[\s\-]*VISA",
    re.IGNORECASE,
)

# Credit card: payment / credit received on the card
_CC_CARD_PAYMENT_RE = re.compile(
    r"PAYMENT[\s\-]*THANK[\s\-]*YOU"
    r"|PAYMENT[\s\-]*-[\s\-]*THANK[\s\-]*YOU"
    r"|PAYMENT[\s\-]*RECEIVED"
    r"|ONLINE[\s\-]*PAYMENT"
    r"|AUTOPAY",
    re.IGNORECASE,
)

# Credit card: interest / fee charges
_FEE_RE = re.compile(
    r"INTEREST|ANNUAL[\s]*FEE|LATE[\s]*FEE|OVERLIMIT[\s]*FEE"
    r"|CASH[\s]*ADVANCE[\s]*FEE|BALANCE[\s]*TRANSFER[\s]*FEE"
    r"|NSF[\s]*FEE|SERVICE[\s]*FEE",
    re.IGNORECASE,
)

# Credit card: refunds / credits
_REFUND_RE = re.compile(r"REFUND|CREDIT|RETURN", re.IGNORECASE)


def detect_transaction_type(description: str, amount: float, source: str | None) -> str:
    """
    Infer a transaction_type string from description, amount, and account source.

    Chequing:
      positive amount                          → 'income'
      negative + CC-payment description        → 'cc_payment'
      negative + other                         → 'purchase'

    Credit card:
      positive amount (money back to card)     → 'cc_payment'
      negative + fee/interest description      → 'fee'
      negative + refund/credit description     → 'refund'
      negative + other                         → 'purchase'
    """
    amt = float(amount)

    if source == "credit_card":
        if amt > 0:
            return "cc_payment"
        if _FEE_RE.search(description):
            return "fee"
        if _REFUND_RE.search(description):
            return "refund"
        return "purchase"

    # chequing (or unknown source — treat as chequing)
    if amt > 0:
        return "income"
    if _CC_PAYMENT_RE.search(description):
        return "cc_payment"
    return "purchase"


@router.post("/upload", response_model=list[TransactionPreview])
async def upload_statement(
    file: UploadFile = File(...),
    statement_type: str = Form("chequing"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Upload a bank statement PDF.

    `statement_type` ('chequing' or 'credit_card') is used only when
    auto-detection via the parser registry fails.  TD Visa / TD Rewards
    statements are auto-detected from their content, so this parameter
    can be omitted for those.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if statement_type not in ("chequing", "credit_card"):
        raise HTTPException(
            status_code=400,
            detail="statement_type must be 'chequing' or 'credit_card'",
        )

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

    year = detect_year_from_text(raw_text)
    if not year:
        year = datetime.now().year

    # ── Auto-detect parser via registry ──────────────────────────────────────
    parse_fn, effective_source = get_parser(raw_text)

    if parse_fn:
        # Registry matched (e.g. TD Visa / TD Rewards Card recognised from content)
        # Credit card PDFs have a two-column layout where layout=True merges
        # sidebar content onto transaction lines. Re-extract with layout=False.
        if effective_source == "credit_card":
            try:
                import pdfplumber
                cc_text = ""
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()  # layout=False
                        if page_text:
                            cc_text += page_text + "\n"
                parse_text = cc_text
            except Exception:
                parse_text = raw_text  # fallback to the original
        else:
            parse_text = raw_text

        try:
            parsed_transactions = parse_fn(parse_text, year)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse transactions: {e}")
    else:
        # ── Fallback: explicit bank detection + statement_type param ──────────
        bank = detect_bank_from_text(raw_text)
        if not bank:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not detect bank from statement. "
                    "Please verify the file or specify statement_type manually."
                ),
            )

        effective_source = statement_type

        try:
            if bank == "TD":
                if statement_type == "credit_card":
                    parsed_transactions = extract_transactions_from_td_visa_text(raw_text, year)
                else:
                    parsed_transactions = extract_transactions_from_td_text(raw_text, year)
            elif bank == "RBC":
                parsed_transactions = extract_transactions_from_rbc_text(raw_text, year)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported bank parser for: {bank}",
                )
        except NotImplementedError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse transactions: {e}")

    # ── Record the statement (prevents re-upload of the same PDF) ────────────
    create_statement_record(
        db=db,
        user_id=current_user.id,
        file_hash=file_hash,
        filename=file.filename,
        statement_type=effective_source,
    )

    # ── Strip CC payment-received rows before preview ─────────────────────────
    # The parser already skips these for TD Visa, but guard here for any parser
    # that may pass them through (positive stored amount = credit on CC card).
    if effective_source == "credit_card":
        parsed_transactions = [
            t for t in parsed_transactions
            if not (float(t["amount"]) > 0 and _CC_CARD_PAYMENT_RE.search(t["description"]))
        ]

    # ── Build preview — no transaction DB writes yet ──────────────────────────
    preview: list[TransactionPreview] = []
    for txn in parsed_transactions:
        category, category_source, confidence = categorize_with_overrides(
            db=db,
            user_id=current_user.id,
            description=txn["description"],
        )

        # 1. Parser may have already set transaction_type (CC parsers always do).
        # 2. If not, run full auto-detection based on source + amount + description.
        txn_type = txn.get("transaction_type")
        if txn_type is None:
            txn_type = detect_transaction_type(
                description=txn["description"],
                amount=txn["amount"],
                source=effective_source,
            )

        # 3. User override takes priority over auto-detection.
        type_override = get_type_override(db, user_id=current_user.id, description=txn["description"])
        if type_override:
            txn_type = type_override

        preview.append(
            TransactionPreview(
                id=None,
                date=txn["date"],
                description=txn["description"],
                amount=txn["amount"],
                category=category,
                category_source=category_source,
                confidence=confidence,
                source=effective_source,
                transaction_type=txn_type,
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
        # Guard: discard CC payment-received rows even if the frontend somehow sends them.
        if item.source == "credit_card" and (
            float(item.amount) > 0 and _CC_CARD_PAYMENT_RE.search(item.description)
        ):
            skipped += 1
            continue

        # Persist manual category changes as overrides so future transactions
        # with matching descriptions are auto-categorized the same way.
        if item.category_source == "manual":
            store_category_override(
                db=db,
                user_id=current_user.id,
                description_pattern=item.description,
                category=item.category,
            )

        # Persist manual transaction_type changes so future uploads remember them.
        if item.transaction_type_source == "manual" and item.transaction_type:
            store_type_override(
                db=db,
                user_id=current_user.id,
                description_pattern=item.description,
                transaction_type=item.transaction_type,
            )

        saved = create_transaction(
            db=db,
            user_id=current_user.id,
            date=item.date,
            description=item.description,
            amount=item.amount,
            category=item.category,
            category_source=item.category_source,
            source=item.source,
            transaction_type=item.transaction_type,
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


@router.post("/backfill-types")
def backfill_types(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """
    One-time endpoint: fills in null source / transaction_type on existing transactions.

    Source inference:
      - If a transaction's date falls within 90 days before a CC bank_statement's
        uploaded_at, it is tagged 'credit_card'; otherwise 'chequing'.
      - If multiple statement types cover the same date, CC takes precedence.

    transaction_type is then derived via detect_transaction_type().
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Fetch CC statement upload windows for this user
    cc_statements = (
        db.query(BankStatement)
        .filter_by(user_id=current_user.id, statement_type="credit_card")
        .all()
    )
    cc_windows: list[tuple] = [
        (stmt.uploaded_at - timedelta(days=90), stmt.uploaded_at)
        for stmt in cc_statements
    ]

    # Fetch all transactions that need fixing
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            or_(Transaction.source == None, Transaction.transaction_type == None),  # noqa: E711
        )
        .all()
    )

    updated = 0
    for txn in txns:
        txn_date = txn.date  # datetime.date

        # Infer source if missing
        if txn.source is None:
            inferred_source = "chequing"
            for window_start, window_end in cc_windows:
                ws_date = window_start.date() if hasattr(window_start, "date") else window_start
                we_date = window_end.date() if hasattr(window_end, "date") else window_end
                if ws_date <= txn_date <= we_date:
                    inferred_source = "credit_card"
                    break
            txn.source = inferred_source

        # Infer transaction_type if missing
        if txn.transaction_type is None:
            txn.transaction_type = detect_transaction_type(
                description=txn.description,
                amount=float(txn.amount),
                source=txn.source,
            )

        updated += 1

    db.commit()
    return {"updated": updated}


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
