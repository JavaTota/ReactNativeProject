"""Bookmarks and likes use the verified user ID and fixed internal table names."""

from utils.errors import execute


def add_relation(db, user_id, post_id, table):
    execute(
        db.table(table).upsert(
            {"user_id": user_id, "trip_id": post_id},
            on_conflict="user_id,trip_id",
            ignore_duplicates=True,
        )
    )


def remove_relation(db, user_id, post_id, table):
    execute(db.table(table).delete().eq("user_id", user_id).eq("trip_id", post_id))


def list_saved(db, user_id, offset):
    rows = execute(
        db.table("saved_trips")
        .select("trip_id,published_trips(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .order("trip_id")
        .range(offset, offset + 19)
    )
    return {"items": rows, "offset": offset, "limit": 20}
