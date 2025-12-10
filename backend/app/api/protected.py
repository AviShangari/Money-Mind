from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(prefix="/protected", tags=["protected"])

@router.get("/me")
async def protected_test(current_user = Depends(get_current_user)):
    if not current_user:
        return {"authenticated": False, "message": "You are NOT logged in."}

    return {
        "authenticated": True,
        "message": "You ARE logged in.",
        "user_email": current_user.email
    }
