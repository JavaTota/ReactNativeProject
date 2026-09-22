"""Per-request Supabase access using the authenticated user's token.

The existing SQL migrations define tables and ownership policies. Connecting as
a database administrator through an ORM would bypass those policies, so this
backend uses Supabase's Data API with the user's Clerk JWT instead.
"""

from typing import Annotated
import httpx
from fastapi import Depends, Request
from supabase import Client, ClientOptions, create_client
from dependencies import User


def create_database(settings, current_user, transport):
    """Shared constructor also used by transport-level tests."""
    return create_client(
        settings.supabase_url,
        settings.supabase_publishable_key.get_secret_value(),
        options=ClientOptions(
            headers={"Authorization": f"Bearer {current_user.token}"},
            auto_refresh_token=False,
            persist_session=False,
            httpx_client=transport,
        ),
    )


def get_db(request: Request, current_user: User):
    settings = request.app.state.settings
    # Both the database and Storage client use this token. No service-role key.
    with httpx.Client(timeout=20) as transport:
        yield create_database(settings, current_user, transport)
    # The connection pool is closed even if the route raises an exception.


Database = Annotated[Client, Depends(get_db)]
