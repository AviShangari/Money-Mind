from datetime import datetime

# --- MONTH MAP FOR TD ---
# TD uses formats like "SEP29", "OCT03", "NOV15"
# This map converts the 3-letter month to a number.
MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12
}


def parse_td_date(date_str: str, year: int) -> datetime.date:
    """
    Convert TD-style dates like 'OCT03' into a Python date object.
    TD does NOT include the year in each row, so the parser passes it in.
    Example: "OCT03", year=2025 → datetime.date(2025, 10, 3)
    """
    # First 3 letters are the month abbreviation
    month_abbrev = date_str[:3].upper()

    # The digits after are the day of month
    day_part = date_str[3:]  # e.g., "03"

    month = MONTH_MAP.get(month_abbrev)
    if not month:
        raise ValueError(f"Unknown month abbreviation: {month_abbrev}")

    # Convert to int
    day = int(day_part)

    return datetime(year, month, day).date()


def parse_amount(amount_str: str) -> float:
    """
    Convert TD amount strings like:
      '487.67'
      '1,500.00'
      '83.70OD'   <-- overdraft, should be negative
      '-23.00'
    into a float.
    """
    if not amount_str:
        return None

    # Remove commas: "1,500.00" → "1500.00"
    cleaned = amount_str.replace(",", "")

    # Handle overdraft amounts ending in "OD"
    if cleaned.endswith("OD"):
        cleaned = cleaned.replace("OD", "")
        return -float(cleaned)

    # Normal number
    return float(cleaned)
