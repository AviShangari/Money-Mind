import re
from datetime import datetime

# Known bank identifiers mapping to parser targets
# We check these against the text stripped of all whitespace and converted to lower case.
# E.g. "TD Canada Trust" becomes "tdcanadatrust"
BANK_IDENTIFIERS = {
    "tdcanadatrust": "TD",
    "toronto-dominion": "TD",
    "thetoronto-dominionbank": "TD",
    "royalbank": "RBC",
    "rbcroyalbank": "RBC",
    "bankofmontreal": "BMO",
    "bmo": "BMO",
    "scotiabank": "Scotiabank",
    "cibc": "CIBC"
}


def detect_bank_from_text(text: str) -> str | None:
    """
    Scans the extracted PDF text for known bank identifiers.
    Returns the mapped bank code (e.g., "TD", "RBC") or None if not found.
    To avoid issues with pdf extraction adding arbitrary whitespace, we
    strip all whitespace for comparison.
    """
    # Remove all whitespace characters (spaces, tabs, newlines)
    text_condensed = re.sub(r'\s+', '', text).lower()
    
    for identifier, code in BANK_IDENTIFIERS.items():
        if identifier in text_condensed:
            return code
    return None


def detect_year_from_text(text: str) -> int | None:
    """
    Attempts to find the statement year from the text.
    Looks for common date patterns like "Statement Period: ... 2024"
    or just the first 4-digit number that looks like a recent year (e.g., 2000-2099).
    """
    # 1. Look for statement period explicit year
    # Example: "Statement Period: Dec 1, 2024 to Dec 31, 2024"
    # We find the last 4-digit number in the statement period line.
    period_match = re.search(r'Statement (Period|Date).*?(20\d{2})', text, re.IGNORECASE)
    if period_match:
        return int(period_match.group(2))

    # 2. Fallback: Find the most frequent recent year (2000-2050)
    # Often statements have multiple dates, so finding the most common year is a safe bet.
    years = re.findall(r'\b(20[0-5]\d)\b', text)
    if years:
        from collections import Counter
        most_common_year = Counter(years).most_common(1)[0][0]
        return int(most_common_year)
        
    return None
