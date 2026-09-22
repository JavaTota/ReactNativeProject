"""Verify Clerk session tokens using the official SDK; do not mint our own JWTs."""

from fastapi import HTTPException
from clerk_backend_api.security import authenticate_request
from clerk_backend_api.security.types import AuthenticateRequestOptions
from models.user import CurrentUser


def verify_session(request, token, settings):
    try:
        state = authenticate_request(
            request,
            AuthenticateRequestOptions(
                secret_key=settings.clerk_secret_key.get_secret_value(),
                authorized_parties=settings.authorized_parties,
                accepts_token=["session_token"],
            ),
        )
    except Exception:
        # Never expose SDK internals or token contents in HTTP errors.
        raise HTTPException(401, "Invalid or expired session.") from None
    payload = state.payload or {}
    if not state.is_signed_in:
        raise HTTPException(401, "Invalid or expired session.")
    if (
        not payload.get("sub")
        or not payload.get("sid")
        or payload.get("sts") == "pending"
    ):
        raise HTTPException(401, "Active user session required.")
    return CurrentUser(user_id=payload["sub"], token=token)
