import re
from typing import List, Dict
from app.transactions.parser.utils import parse_td_date, parse_amount


# Regex to parse TD transaction lines
TD_LINE_REGEX = re.compile(
    r"""
    ^\s*
    (?P<description>.+?)       # description (lazy match)
    \s+
    (?P<withdrawal>-?\d{1,3}(?:,\d{3})*\.\d{2})?  # optional withdrawal
    \s*
    (?P<deposit>-?\d{1,3}(?:,\d{3})*\.\d{2})?     # optional deposit
    \s+
    (?P<date>[A-Z]{3}\d{2})    # date like OCT03
    (?:\s+ (?P<balance>-?\d{1,3}(?:,\d{3})*\.\d{2}(?:OD)?))?  # optional balance
    \s*$
    """,
    re.VERBOSE
)


def extract_transactions_from_td_text(text: str, year: int) -> List[Dict]:
    """
    Given full PDF text from a TD statement, extract all transactions.
    """
    transactions = []
    lines = text.splitlines()

    in_table = False

    for line in lines:
        line = line.strip()

        # Detect start of table
        if "Description" in line and "Date" in line:
            in_table = True
            continue

        # Detect end of table
        if in_table and ("CLOSING BALANCE" in line or "Closing Balance" in line):
            break

        if not in_table:
            continue

        # Skip empty lines
        if not line.strip():
            continue

        # Try matching the regex
        match = TD_LINE_REGEX.match(line)
        if not match:
            continue  # ignore lines that don't match transaction format

        data = match.groupdict()

        desc = data["description"].strip()

        # Determine amount (withdrawals negative, deposits positive)
        withdrawal_str = data["withdrawal"]
        deposit_str = data["deposit"]

        if withdrawal_str:
            amount = -parse_amount(withdrawal_str)
        elif deposit_str:
            amount = parse_amount(deposit_str)
        else:
            # No money movement → skip these lines
            continue

        # Parse date
        date = parse_td_date(data["date"], year)

        transactions.append({
            "date": date,
            "description": desc,
            "amount": amount,
        })

    return transactions
