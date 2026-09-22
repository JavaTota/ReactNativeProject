from typing import Annotated
from fastapi import APIRouter, Query, Response
from database import Database
from dependencies import User
from schemas.common import Identifier, Offset, Page
from schemas.journey import JourneyResponse
from schemas.post import PublishedPost, ReuseInput
from services import post_service, social_service

router = APIRouter(prefix="/api/posts", tags=["Posts"])


@router.get("", response_model=Page[PublishedPost])
def list_posts(
    db: Database,
    offset: Offset = 0,
    country: Annotated[str | None, Query(max_length=100)] = None,
):
    """Optional exact country filter; 20 posts per page."""
    return post_service.list_posts(db, offset, country)


@router.get("/{post_id}", response_model=PublishedPost)
def get_post(post_id: Identifier, db: Database):
    return post_service.get_post(db, post_id)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: Identifier, db: Database, current_user: User):
    post_service.delete_post(db, current_user.user_id, post_id)
    return Response(status_code=204)


@router.post(
    "/{post_id}/reuse",
    response_model=JourneyResponse,
    response_model_exclude_none=True,
    status_code=201,
)
def reuse_post(post_id: Identifier, body: ReuseInput, db: Database, current_user: User):
    """Create a new plan with reset bookings and empty journals, preserving attribution."""
    return post_service.reuse_post(db, current_user.user_id, post_id, body.startDate)


@router.put("/{post_id}/save", status_code=204)
def save_post(post_id: Identifier, db: Database, current_user: User):
    social_service.add_relation(db, current_user.user_id, post_id, "saved_trips")
    return Response(status_code=204)


@router.delete("/{post_id}/save", status_code=204)
def unsave_post(post_id: Identifier, db: Database, current_user: User):
    social_service.remove_relation(db, current_user.user_id, post_id, "saved_trips")
    return Response(status_code=204)


@router.put("/{post_id}/like", status_code=204)
def like_post(post_id: Identifier, db: Database, current_user: User):
    social_service.add_relation(db, current_user.user_id, post_id, "trip_likes")
    return Response(status_code=204)


@router.delete("/{post_id}/like", status_code=204)
def unlike_post(post_id: Identifier, db: Database, current_user: User):
    social_service.remove_relation(db, current_user.user_id, post_id, "trip_likes")
    return Response(status_code=204)
