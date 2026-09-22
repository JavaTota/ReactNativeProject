"""Small HTTP handlers delegate persistence to journey_service."""

from fastapi import APIRouter, Response
from database import Database
from dependencies import User
from schemas.common import Identifier, Offset, Page
from schemas.journey import JourneyInput, JourneyResponse
from schemas.post import PublishInput, PublishResponse
from services import journey_service, post_service

router = APIRouter(prefix="/api/journeys", tags=["Journeys"])


@router.get("", response_model=Page[JourneyResponse], response_model_exclude_none=True)
def list_journeys(db: Database, current_user: User, offset: Offset = 0):
    return journey_service.list_journeys(db, current_user.user_id, offset)


@router.post(
    "",
    response_model=JourneyResponse,
    response_model_exclude_none=True,
    status_code=201,
)
def create_journey(body: JourneyInput, db: Database, current_user: User):
    return journey_service.create_journey(db, current_user.user_id, body)


@router.get(
    "/{journey_id}", response_model=JourneyResponse, response_model_exclude_none=True
)
def get_journey(journey_id: Identifier, db: Database, current_user: User):
    return journey_service.get_journey(db, current_user.user_id, journey_id)


@router.put(
    "/{journey_id}", response_model=JourneyResponse, response_model_exclude_none=True
)
def update_journey(
    journey_id: Identifier, body: JourneyInput, db: Database, current_user: User
):
    """Replace the full editable trip. Include all stops that should remain."""
    return journey_service.update_journey(db, current_user.user_id, journey_id, body)


@router.delete("/{journey_id}", status_code=204)
def delete_journey(journey_id: Identifier, db: Database, current_user: User):
    journey_service.delete_journey(db, current_user.user_id, journey_id)
    return Response(status_code=204)


@router.post("/{journey_id}/publish", response_model=PublishResponse, status_code=201)
def publish_journey(journey_id: Identifier, body: PublishInput, db: Database):
    """Publish visited journal content, excluding private reservation details.

    Requires Completed status, a past/current end date, a profile and a visited stop.
    Republishing refreshes the same snapshot. These rules are enforced in SQL.
    """
    return {"id": post_service.publish_journey(db, journey_id, body)}
