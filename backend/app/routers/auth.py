"""Supabase email + password auth."""

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import current_user
from ..schemas import AuthResponse, LoginRequest, SignupRequest
from ..supabase_client import get_service_client

router = APIRouter()


def _session_to_auth_response(session) -> AuthResponse:
    if session is None or session.user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Supabase returned no session")
    return AuthResponse(
        user_id=session.user.id,
        email=session.user.email,
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_in=session.expires_in or 3600,
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest) -> AuthResponse:
    client = get_service_client()
    try:
        result = client.auth.sign_up(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:  # noqa: BLE001 — supabase client raises plain Exception for auth errors
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    if result.user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Sign-up failed")

    # Pre-create the driver profile row so /profile works immediately.
    client.table("drivers").upsert(
        {
            "user_id": result.user.id,
            "name": payload.name,
            "vehicle_mode": "car",
            "language": "en-IN",
            "battery_percent": 80,
        }
    ).execute()

    if result.session is None:
        # Email confirmation may be required — surface that clearly.
        raise HTTPException(
            status.HTTP_202_ACCEPTED,
            "Account created. Check your email to confirm before signing in.",
        )
    return _session_to_auth_response(result.session)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    client = get_service_client()
    try:
        result = client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password") from exc

    if result.session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login failed")
    return _session_to_auth_response(result.session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_: dict = Depends(current_user)) -> None:
    # Stateless JWTs — client should drop the token. Endpoint exists for parity.
    return None


@router.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {"user_id": user["id"], "email": user["email"]}
