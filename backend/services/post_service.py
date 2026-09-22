"""Public itinerary snapshots and reuse; database functions enforce publication rules."""

from fastapi import HTTPException
from utils.errors import execute
from services.journey_service import get_journey


def publish_journey(db, journey_id, body):
    return execute(
        db.rpc(
            "publish_journey",
            {
                "journey_id_input": journey_id,
                "country_input": body.country,
                "caption_input": body.caption,
            },
        )
    )


def list_posts(db, offset, country):
    query = (
        db.table("published_trips")
        .select("*,published_stops(*)")
        .order("published_at", desc=True)
        .order("id")
        .range(offset, offset + 19)
    )
    if country:
        query = query.eq("country", country)
    return {"items": execute(query), "offset": offset, "limit": 20}


def get_post(db, post_id):
    rows = execute(
        db.table("published_trips")
        .select("*,published_stops(*)")
        .eq("id", post_id)
        .limit(1)
    )
    if not rows:
        raise HTTPException(404, "Post not found.")
    return rows[0]


def delete_post(db, user_id, post_id):
    rows = execute(
        db.table("published_trips").delete().eq("id", post_id).eq("user_id", user_id)
    )
    if not rows:
        raise HTTPException(404, "Post not found.")


def reuse_post(db, user_id, post_id, start_date):
    # New IDs, reset bookings, and blank journals are created atomically in SQL.
    journey_id = execute(
        db.rpc(
            "reuse_itinerary",
            {"post_id_input": post_id, "start_date_input": start_date},
        )
    )
    return get_journey(db, user_id, journey_id)
