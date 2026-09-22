from fastapi import APIRouter
from database import Database
from dependencies import User
from schemas.media import UploadInput, UploadResponse, ReadMediaInput, ReadMediaResponse
from services import media_service

router = APIRouter(prefix="/api/media", tags=["Media"])


@router.post("/upload", response_model=UploadResponse, status_code=201)
def create_upload(body: UploadInput, db: Database, current_user: User):
    """Return a direct upload URL/token. JPEG, PNG, WebP only; max 10 MiB in Storage."""
    return media_service.create_upload(db, current_user.user_id, body.extension)


@router.post("/read", response_model=ReadMediaResponse)
def read_photo(body: ReadMediaInput, db: Database):
    """Signed URL valid for 300 seconds; ownership/publication checked by Storage RLS."""
    return media_service.read_media(db, body.path)
