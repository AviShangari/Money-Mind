import os
import sys

# Add the project root to the path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.transactions.parser.detector import detect_bank_from_text, detect_year_from_text


def test_detector():
    td_text = """
    TD Canada Trust
    Statement Period: Dec 1, 2024 to Dec 31, 2024
    """

    rbc_text = """
    Your Royal Bank statement
    Some transactions in 2025
    2025
    """

    unknown_text = """
    Statement Period: Jan 1, 2020 to Jan 31, 2020
    """

    print("--- TD Test ---")
    print("Bank:", detect_bank_from_text(td_text))
    print("Year:", detect_year_from_text(td_text))

    print("\n--- RBC Test ---")
    print("Bank:", detect_bank_from_text(rbc_text))
    print("Year:", detect_year_from_text(rbc_text))

    print("\n--- Unknown Bank Test ---")
    print("Bank:", detect_bank_from_text(unknown_text))
    print("Year:", detect_year_from_text(unknown_text))


if __name__ == "__main__":
    test_detector()

