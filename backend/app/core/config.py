import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

if not GOOGLE_CLIENT_ID:
    raise RuntimeError("GOOGLE_CLIENT_ID is not set. Add it to your .env file.")

IS_PRODUCTION = os.getenv("IS_PRODUCTION", "false").lower() == "true"
