"""
Parser for TD Visa / TD Rewards Card credit card statements.

Detected when the statement text contains both:
  - a TD bank identifier ("TD Canada Trust", "TD Rewards", etc.)
  - the column headers TRANSACTION DATE and POSTING DATE

pdfplumber (layout=False) produces lines like:
    SEP19 SEP22 UBERCANADA/UBEREATSTORONTO $48.46 CreditLimit $2,000
    SEP25 SEP26 PAYMENT-THANKYOU -$100.00
    OCT1 OCT2 UBERCANADA/UBEREATSTORONTO $37.32

Key observations:
  - Dates are compacted: "SEP19" (no space between month and day)
  - Columns separated by single spaces
  - Right-column content may be appended after the amount on some lines
  - Multi-line descriptions: continuation on the next line (second line has no dates)

Sign convention:
  positive in statement  → charge/purchase (money owed to TD)
  negative in statement  → credit on card (payment, refund)

Storage convention (inverted):
  negative stored amount → spending / expense
  positive stored amount → income / credit
"""

import re
from datetime import datetime
from typing import List, Dict

from app.transactions.parser.registry import register


# ---------------------------------------------------------------------------
# Month helper
# ---------------------------------------------------------------------------

_MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}

_MONTHS = "|".join(_MONTH_MAP.keys())


# ---------------------------------------------------------------------------
# Transaction line regex
#
# Matches lines like:
#   SEP19 SEP22 UBERCANADA/UBEREATSTORONTO $48.46
#   SEP25 SEP26 PAYMENT-THANKYOU -$100.00
#   OCT1 OCT2 UBERCANADA/UBEREATSTORONTO $37.32 CreditLimit $2,000
#
# Dates: month abbreviation immediately followed by 1-2 digit day (no space)
# Amount: -?$digits.digits  (we grab the FIRST $ amount on the line)
# ---------------------------------------------------------------------------

_CC_LINE_RE = re.compile(
    r"^\s*"
    r"(?P<txn_month>" + _MONTHS + r")(?P<txn_day>\d{1,2})"
    r"\s+"
    r"(?P<post_month>" + _MONTHS + r")(?P<post_day>\d{1,2})"
    r"\s+"
    r"(?P<description>.+?)"
    r"\s+"
    r"(?P<amount>-?\$[\d,]+\.\d{2})"
    r"(?:\s|$)",       # stop at whitespace or end-of-line (don't consume right-column junk)
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Classification patterns
# ---------------------------------------------------------------------------

# Payment lines to SKIP entirely — payments received on the card are not purchases.
_CC_PAYMENT_SKIP_RE = re.compile(
    r"PAYMENT[\s\-]*THANK[\s\-]*YOU"
    r"|PAYMENT[\s\-]*-[\s\-]*THANK"
    r"|PAYMENT[\s\-]*RECEIVED"
    r"|ONLINE[\s\-]*PAYMENT"
    r"|AUTOPAY",
    re.IGNORECASE,
)

_PAYMENT_RE = re.compile(r"PAYMENT", re.IGNORECASE)
_FEE_RE = re.compile(
    r"INTEREST|ANNUAL\s*FEE|OVERLIMIT\s*FEE|CASH\s*ADVANCE\s*FEE"
    r"|LATE\s*FEE|BALANCE\s*TRANSFER\s*FEE|NSF\s*FEE|SERVICE\s*FEE",
    re.IGNORECASE,
)

# Lines to skip even if they match the date pattern
_SKIP_DESCRIPTIONS = re.compile(
    r"PREVIOUSSTATEMENTBALANCE|PREVIOUS\s*STATEMENT\s*BALANCE"
    r"|NEWBALANCE|NEW\s*BALANCE"
    r"|CREDITLIMIT|CREDIT\s*LIMIT"
    r"|AVAILABLECREDIT|AVAILABLE\s*CREDIT",
    re.IGNORECASE,
)

_STOP_PATTERNS = [
    "TOTALNEWBALANCE",
    "TOTAL NEW BALANCE",
]


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------

def _detect_td_visa(text: str) -> bool:
    """
    Return True when the text looks like a TD Visa / TD Rewards Card statement.
    """
    sample = re.sub(r"\s+", "", text[:5000]).upper()

    is_td = (
        "TDCANADATRUST" in sample
        or "TDREWARDS" in sample
        or "THETORONTO-DOMINIONBANK" in sample
        or "TORONTODOMINIONBANK" in sample
    )
    has_posting_date = "POSTING" in sample

    return is_td and has_posting_date


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(month_str: str, day_str: str, year: int):
    month = _MONTH_MAP.get(month_str.upper())
    if not month:
        raise ValueError(f"Unknown month: {month_str!r}")
    return datetime(year, month, int(day_str)).date()


def _parse_amount(raw: str) -> float:
    """'$24.00' → 24.0  |  '-$10.00' → -10.0  |  '$1,829.24' → 1829.24"""
    return float(raw.strip().replace("$", "").replace(",", ""))


def _classify(description: str, raw_amount: float) -> str:
    if raw_amount < 0:
        return "payment" if _PAYMENT_RE.search(description) else "refund"
    return "fee" if _FEE_RE.search(description) else "purchase"


def _should_stop(line: str) -> bool:
    condensed = re.sub(r"\s+", "", line).upper()
    return any(pat in condensed for pat in ["TOTALNEWBALANCE"])


def _should_skip(desc: str) -> bool:
    return bool(_SKIP_DESCRIPTIONS.search(desc))


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def extract_transactions_from_td_visa_text(text: str, year: int) -> List[Dict]:
    """
    Parse all transactions from pdfplumber-extracted text of a TD Visa
    / TD Rewards Card statement.

    Returns a list of dicts with:
        date             – datetime.date  (transaction date)
        description      – str
        amount           – float  (negative = expense, positive = credit/refund)
        transaction_type – 'purchase' | 'payment' | 'fee' | 'refund'
    """
    transactions: List[Dict] = []

    for line in text.splitlines():
        # Stop at the final balance line
        if _should_stop(line):
            continue  # continue (not break) to handle multi-page statements

        match = _CC_LINE_RE.match(line)
        if not match:
            continue

        d = match.groupdict()
        description = d["description"].strip()

        # Skip balance/summary lines
        if _should_skip(description):
            continue

        raw_amount = _parse_amount(d["amount"])

        # Drop payment-received lines (credits on the card from the cardholder paying their bill).
        # raw_amount < 0 means credit; combined with a payment description → skip entirely.
        if raw_amount < 0 and _CC_PAYMENT_SKIP_RE.search(description):
            continue

        try:
            txn_date = _parse_date(d["txn_month"], d["txn_day"], year)
        except (ValueError, IndexError):
            continue

        transactions.append({
            "date": txn_date,
            "description": description,
            "amount": -raw_amount,          # invert: charge→negative, credit→positive
            "transaction_type": _classify(description, raw_amount),
        })

    return transactions


# ---------------------------------------------------------------------------
# Self-register into the parser registry
# ---------------------------------------------------------------------------

register(_detect_td_visa, extract_transactions_from_td_visa_text, "credit_card")
