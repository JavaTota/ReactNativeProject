"""The shared authentication dependency, equivalent to your sample's get_current_user."""

from typing import Annotated
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from models.user import CurrentUser
from utils.security import verify_session

# HTTPBearer also adds the Authorize button in Swagger.
bearer = HTTPBearer(
    auto_error=False,
    scheme_name="ClerkSession",
    description="Clerk session JWT from getToken(); never your secret key.",
)


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> CurrentUser:
    if not credentials:
        raise HTTPException(401, "Authentication required.")
    return verify_session(request, credentials.credentials, request.app.state.settings)


User = Annotated[CurrentUser, Depends(get_current_user)]
