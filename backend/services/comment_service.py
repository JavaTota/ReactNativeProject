from fastapi import HTTPException
from utils.errors import execute


def list_comments(db, post_id, offset):
    rows = execute(
        db.table("comments")
        .select("*")
        .eq("trip_id", post_id)
        .order("created_at")
        .order("id")
        .range(offset, offset + 49)
    )
    return {"items": rows, "offset": offset, "limit": 50}


def create_comment(db, user_id, post_id, body):
    rows = execute(
        db.table("comments").insert(
            {"body": body, "user_id": user_id, "trip_id": post_id}
        )
    )
    return rows[0]


def delete_comment(db, user_id, comment_id):
    rows = execute(
        db.table("comments").delete().eq("id", str(comment_id)).eq("user_id", user_id)
    )
    if not rows:
        raise HTTPException(404, "Comment not found.")
