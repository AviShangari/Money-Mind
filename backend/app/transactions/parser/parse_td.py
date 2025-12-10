import re
from typing import List, Dict
from app.transactions.parser.utils import parse_td_date, parse_amount


# Regex to parse TD transaction lines
# Regex to capture the components: Description ... [Middle Part] ... Date ... [Balance]
# We make Description greedy enough but stop before the date.
# The 'Middle Part' will contain the amounts and spaces.
TD_LINE_REF_REGEX = re.compile(
    r"""
    ^\s*
    (?P<description>.+?)       # description
    (?P<middle>\s+[-0-9.,\s]+)   # middle part (amounts) with spaces captured
    (?P<date>[A-Z]{3}\d{2})    # date like OCT03
    (?:\s+ (?P<balance>-?\d{1,3}(?:,\d{3})*\.\d{2}(?:OD)?))?  # optional balance
    \s*$
    """,
    re.VERBOSE
)

def extract_transactions_from_td_text(text: str, year: int) -> List[Dict]:
    """
    Given full PDF text from a TD statement, extract all transactions.
    heuristically determines Withdrawal vs Deposit based on spacing if only one number is present.
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
            
        if not line.strip():
            continue

        match = TD_LINE_REF_REGEX.match(line)
        if not match:
            continue

        data = match.groupdict()
        desc = data["description"].strip()
        middle = data["middle"]
        date_str = data["date"]
        
        # Parse the middle section
        # It should contain 1 or 2 numbers.
        # Clean up spaces
        # Find all numbers in the middle string
        numbers = re.findall(r'-?\d{1,3}(?:,\d{3})*\.\d{2}', middle)
        
        withdrawal = 0.0
        deposit = 0.0
        
        if len(numbers) == 2:
            # Easy case: 1st is W, 2nd is D
            withdrawal = parse_amount(numbers[0])
            deposit = parse_amount(numbers[1])
            
        elif len(numbers) == 1:
            # Hard case: Is it W or D?
            # Check spacing.
            # "Withdrawals" is the first column, "Deposits" is the second.
            # In the 'middle' string:
            # W: "100.00        "
            # D: "        100.00"
            
            # We find the index of the number in the middle string
            num_str = numbers[0]
            idx = middle.find(num_str)
            
            # Calculate spaces before and after
            spaces_before = idx
            spaces_after = len(middle) - (idx + len(num_str))
            
            # Heuristic based on logs:
            # Deposits are right-aligned, close to the Date column -> Low 'spaces_after' (e.g. 1)
            # Withdrawals are left-aligned (in their column), separated from Date by the empty Deposit column -> High 'spaces_after' (e.g. > 10)
            
            # We use a safe threshold.
            if spaces_after > 4:
                withdrawal = parse_amount(num_str)
            else:
                deposit = parse_amount(num_str)
        else:
            # 0 numbers? Skip
            continue

        # Calculate final amount
        # Withdrawals are negative, Deposits are positive
        final_amount = 0.0
        if withdrawal > 0:
            final_amount -= withdrawal
        if deposit > 0:
            final_amount += deposit
            
        # Parse date
        date_obj = parse_td_date(date_str, year)

        transactions.append({
            "date": date_obj,
            "description": desc,
            "amount": final_amount,
        })

    return transactions
