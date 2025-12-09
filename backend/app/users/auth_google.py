from google.oauth2 import id_token
from google.auth.transport import requests


def verify_google_token(token: str, client_id: str):
    """
    Verifies a Google ID token.
    Returns the decoded payload if valid.
    Raises ValueError if invalid.
    """
    try:
        request = requests.Request()
        payload = id_token.verify_oauth2_token(
            token,
            request,
            client_id
        )
        return payload
    except Exception as e:
        raise ValueError(f"Invalid Google token: {e}")
