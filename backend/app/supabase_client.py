"""Thin wrapper that exposes the cached service-role Supabase client."""

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache(maxsize=1)
def _client() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)


def get_service_client() -> Client:
    return _client()
