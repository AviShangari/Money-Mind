import pdfplumber

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts raw text from a TD bank statement PDF.
    Uses pdfplumber because TD statements have table-like structures
    that pdfplumber handles better than PyPDF2.
    
    Returns:
        A single string containing all text from all pages.
    """
    all_text = ""

    # Open the PDF using pdfplumber
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            # Extract text from the page
            page_text = page.extract_text(layout=True)

            # Some pages may return None if empty, so we guard against that
            if page_text:
                all_text += page_text + "\n"

    return all_text
