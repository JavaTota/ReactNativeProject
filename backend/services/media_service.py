"""Create permissions for direct uploads instead of routing image bytes through Python."""

from uuid import uuid4
from utils.errors import storage_call


def create_upload(db, user_id, extension):
    path = f"{user_id}/{uuid4()}.{extension}"
    result = storage_call(
        lambda: db.storage.from_("journal-media").create_signed_upload_url(path)
    )
    return {"path": path, "signedUrl": result["signed_url"], "token": result["token"]}


def read_media(db, path):
    # Storage RLS allows own photos and photos explicitly shared in a published post.
    result = storage_call(
        lambda: db.storage.from_("journal-media").create_signed_url(path, 300)
    )
    return {"signedUrl": result["signedURL"]}
