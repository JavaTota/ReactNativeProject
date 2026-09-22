"""Private journey operations. Keep related saves inside the existing SQL RPC."""

import re
from uuid import uuid4
from fastapi import HTTPException
from models.journey import SELECTION, to_journey
from utils.errors import execute


def check_photos(body, user_id):
    for stop in body.stops:
        if stop.photoUri and (
            not stop.photoUri.startswith(user_id + "/")
            or not re.fullmatch(r"[\w/-]+\.(jpg|png|webp)", stop.photoUri)
        ):
            raise HTTPException(
                400, "Photo must be a journal-media path owned by your account."
            )


def list_journeys(db, user_id, offset):
    rows = execute(
        db.table("journeys")
        .select(SELECTION)
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .order("id")
        .range(offset, offset + 19)
    )
    return {"items": [to_journey(row) for row in rows], "offset": offset, "limit": 20}


def get_journey(db, user_id, journey_id):
    rows = execute(
        db.table("journeys")
        .select(SELECTION)
        .eq("id", journey_id)
        .eq("user_id", user_id)
        .limit(1)
    )
    if not rows:
        raise HTTPException(404, "Journey not found.")
    return to_journey(rows[0])


def create_journey(db, user_id, body):
    check_photos(body, user_id)
    journey_id = str(uuid4())
    execute(
        db.rpc(
            "save_journey",
            {
                "payload": {
                    **body.model_dump(mode="json", exclude_none=True),
                    "id": journey_id,
                }
            },
        )
    )
    return get_journey(db, user_id, journey_id)


def update_journey(db, user_id, journey_id, body):
    existing = get_journey(db, user_id, journey_id)
    check_photos(body, user_id)
    payload = {**body.model_dump(mode="json", exclude_none=True), "id": journey_id}
    # Clients cannot rewrite attribution or the server's publication identifier.
    for name in ("source", "publishedId"):
        if name in existing:
            payload[name] = existing[name]
    execute(db.rpc("save_journey", {"payload": payload}))
    return get_journey(db, user_id, journey_id)


def delete_journey(db, user_id, journey_id):
    get_journey(db, user_id, journey_id)
    execute(db.table("journeys").delete().eq("id", journey_id).eq("user_id", user_id))
