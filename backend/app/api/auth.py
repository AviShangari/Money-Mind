from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
async def me(current_user = Depends(get_current_user)):
    if not current_user:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "picture_url": current_user.picture_url
        }
    }
