"""Translate upstream failures without exposing SQL details or credentials."""

import httpx
from fastapi import HTTPException
from postgrest.exceptions import APIError
from storage3.exceptions import StorageApiError


def execute(query):
    try:
        return query.execute().data
    except APIError as exc:
        code = str(exc.code)
        status = (
            403
            if code == "42501"
            else 409
            if code == "23505"
            else 400
            if code in {"23503", "23514", "22P02", "P0001", "22007"}
            else 502
        )
        message = (
            "Database request failed."
            if status == 502
            else "Request violates ownership or data rules."
        )
        raise HTTPException(status, message) from None
    except httpx.HTTPError:
        raise HTTPException(502, "Database request failed.") from None


def storage_call(operation):
    try:
        return operation()
    except (StorageApiError, httpx.HTTPError):
        raise HTTPException(502, "Storage request failed.") from None
