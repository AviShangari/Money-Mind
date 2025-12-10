from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response, Cookie
from app.users.auth_google import verify_google_token
from app.core.config import GOOGLE_CLIENT_ID
from app.users.service import get_user_by_email, create_user
from app.sessions.service import create_session
from app.sessions.models import Session as SessionModel
from app.core.dependencies import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str


@router.post("/google-login")
async def google_login(payload: GoogleLoginRequest, response: Response, db=Depends(get_db)):
    id_token = payload.id_token
    print(f"Received login request for token: {id_token[:10]}...")
    # 1. Verify Google token
    try:
        print("Verifying google token...")
        google_user = verify_google_token(id_token, GOOGLE_CLIENT_ID)
        print("Token verified!")
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
        httponly=False,
        secure=False,
        samesite="lax",
        path="/"
    )

    print("Setting cookie: ",  session.session_id)
    return {"message": "Login successful", "email": email}


@router.post("/logout")
def logout(
    response: Response,
    session_id: str = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Logs out the user by deleting the session and clearing the cookie.
    """

    # If no session cookie exists, nothing to do.
    if not session_id:
        response.delete_cookie("session_id")
        return {"message": "Logged out"}

    # Delete session from DB
    session = db.query(SessionModel).filter_by(session_id=session_id).first()

    if session:
        db.delete(session)
        db.commit()

    # Clear cookie
    response.delete_cookie("session_id")
    print("Logged out")
    return {"message": "Logged out"}
