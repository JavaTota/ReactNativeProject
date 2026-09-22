"""Current user's public application profile."""

from fastapi import APIRouter
from database import Database
from dependencies import User
from schemas.user import ProfileInput, ProfileResponse, MeResponse
from services import user_service

router = APIRouter(prefix="/api/me", tags=["Users"])


@router.get("", response_model=MeResponse)
def get_current_profile(db: Database, current_user: User):
    """A new Clerk account returns profile=null until the user saves a name."""
    return {
        "userId": current_user.user_id,
        "profile": user_service.get_profile(db, current_user.user_id),
    }


@router.put("", response_model=ProfileResponse)
def update_current_profile(body: ProfileInput, db: Database, current_user: User):
    """Create or replace the display name and bio for this account."""
    return user_service.save_profile(db, current_user.user_id, body)
