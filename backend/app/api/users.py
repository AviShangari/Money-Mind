from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response
from app.users.auth_google import verify_google_token
from app.core.config import GOOGLE_CLIENT_ID
from app.users.service import get_user_by_email, create_user
from app.sessions.service import create_session
from app.core.dependencies import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google-login")
async def google_login(id_token: str, response: Response, db=Depends(get_db)):
    # 1. Verify Google token
    try:
        google_user = verify_google_token(id_token, GOOGLE_CLIENT_ID)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Extract user info
    email = google_user.get("email")
    full_name = google_user.get("name")
    picture_url = google_user.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in Google token")

    # 3. Check or create user
    user = get_user_by_email(db, email)
    if not user:
        user = create_user(
            db,
            email=email,
            full_name=full_name,
            picture_url=picture_url
        )

    # 4. Create session
    session = create_session(db, user.id)

    # 5. Set session cookie
    response.set_cookie(
        key="session_id",
        value=session.session_id,
        httponly=True,
        secure=False,
        samesite="lax",
    )

    return {"message": "Login successful", "email": email}
