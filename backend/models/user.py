"""Verified session identity, not a second password/account table."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    # Avoid exposing a token in debug representations.
    token: str = field(repr=False)
