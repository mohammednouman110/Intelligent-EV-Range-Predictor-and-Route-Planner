"""Singleton Supabase clients (anon + service role) plus auth dependency."""

from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

from .config import get_settings


@lru_cache(maxsize=1)
def _service_client() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)


def get_service_client() -> Client:
    """Service-role client: bypasses RLS. Use only inside trusted server code."""
    return _service_client()


def get_user_client(jwt: str) -> Client:
    """An anon client with the caller's JWT attached — respects RLS."""
    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_anon_key)
    client.postgrest.auth(jwt)
    return client


def _looks_like_jwt(token: str) -> bool:
    """A JWT has three non-empty segments separated by dots."""
    return token.count(".") == 2 and all(segment for segment in token.split("."))


def current_user(authorization: str = Header(..., description="Bearer <jwt>")) -> dict:
    """Verify the bearer token with Supabase and return the user row."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    if not token or token.lower() in {"null", "undefined"}:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    if not _looks_like_jwt(token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token format")
    try:
        response = _service_client().auth.get_user(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    if response.user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return {"id": response.user.id, "email": response.user.email, "jwt": token}


CurrentUser = Depends(current_user)
