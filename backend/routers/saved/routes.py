from fastapi import APIRouter
from database import Database
from dependencies import User
from schemas.common import Offset, Page
from schemas.post import SavedTrip
from services.social_service import list_saved

router = APIRouter(prefix="/api/saved", tags=["Saved"])


@router.get("", response_model=Page[SavedTrip])
def get_saved_posts(db: Database, current_user: User, offset: Offset = 0):
    """Bookmarks reference public posts; reusing a post is a separate operation."""
    return list_saved(db, current_user.user_id, offset)
