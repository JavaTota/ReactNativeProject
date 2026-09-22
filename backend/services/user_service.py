"""Profile persistence. Passwords and login email stay in Clerk."""

from datetime import datetime, timezone
from utils.errors import execute


def get_profile(db, user_id):
    rows = execute(db.table("profiles").select("*").eq("user_id", user_id).limit(1))
    return rows[0] if rows else None


def save_profile(db, user_id, body):
    rows = execute(
        db.table("profiles").upsert(
            {
                **body.model_dump(),
                "user_id": user_id,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    )
    return rows[0]
