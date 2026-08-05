"""Driver profile CRUD against the `drivers` table."""

from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import current_user
from ..schemas import ProfileIn, ProfileOut
from ..supabase_client import get_service_client

router = APIRouter()


@router.get("", response_model=ProfileOut)
def get_profile(user: dict = Depends(current_user)) -> ProfileOut:
    client = get_service_client()
    result = (
        client.table("drivers")
        .select("*")
        .eq("user_id", user["id"])
        .maybe_single()
        .execute()
    )
    row = result.data
    if row is None:
        # Lazy-create so the UI never 404s on a brand-new user.
        client.table("drivers").insert(
            {"user_id": user["id"], "name": "", "vehicle_mode": "car", "language": "en-IN", "battery_percent": 80}
        ).execute()
        return ProfileOut(user_id=user["id"], name="", phone_number=None, vehicle_number=None,
                          vehicle_mode="car", language="en-IN", battery_percent=80)
    return ProfileOut(
        user_id=user["id"],
        name=row.get("name", ""),
        phone_number=row.get("phone_number"),
        vehicle_number=row.get("vehicle_number"),
        vehicle_mode=row.get("vehicle_mode", "car"),
        language=row.get("language", "en-IN"),
        battery_percent=row.get("battery_percent", 80),
    )


@router.put("", response_model=ProfileOut)
def update_profile(payload: ProfileIn, user: dict = Depends(current_user)) -> ProfileOut:
    client = get_service_client()
    upsert_payload = {
        "user_id": user["id"],
        "name": payload.name,
        "phone_number": payload.phone_number,
        "vehicle_number": payload.vehicle_number,
        "vehicle_mode": payload.vehicle_mode,
        "language": payload.language,
        "battery_percent": payload.battery_percent,
    }
    try:
        client.table("drivers").upsert(upsert_payload).execute()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Failed to save: {exc}") from exc
    return ProfileOut(user_id=user["id"], **payload.model_dump())
