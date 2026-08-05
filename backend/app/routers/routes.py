"""Route planning: OpenRouteService + Supabase persistence."""

import logging
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from ..config import get_settings
from ..deps import current_user
from ..schemas import (
    NearbyPlace,
    PlanRouteRequest,
    PlanRouteResponse,
    SourcePoint,
)
from ..services.ors import ORSClient, ORSError
from ..services.predictor import predict_plan
from ..supabase_client import get_service_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/plan", response_model=PlanRouteResponse)
def plan_route(
    payload: PlanRouteRequest,
    user: dict = Depends(current_user),
) -> PlanRouteResponse:
    """Resolve start/stops/destination, hit ORS, map into the frontend shape."""
    settings = get_settings()
    if payload.source_point is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "source_point is required (use the geolocation hook)")

    coordinates: List[List[float]] = [[payload.source_point.lng, payload.source_point.lat]]

    # For simplicity we rely on ORS geocoding for the named start/destination and
    # any user-entered stops. If geocoding fails, callers should pass coordinates
    # via the source_point + future "destination_point" fields.
    client = ORSClient(api_key=settings.ors_api_key, http_client=httpx.Client(timeout=20.0))
    try:
        start = client.geocode(payload.start) if payload.start else (payload.source_point.lat, payload.source_point.lng)
        destination = client.geocode(payload.destination) if payload.destination else None
    except ORSError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Geocoding failed: {exc}") from exc

    if destination is not None:
        coordinates.append([destination[1], destination[0]])
    # Note: per-stop coordinates can be appended here once StopInput accepts lat/lng.

    try:
        route = client.directions(
            coordinates=coordinates,
            vehicle_mode=payload.vehicle_mode,
        )
    except ORSError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Routing failed: {exc}") from exc

    geometry = [
        SourcePoint(lat=lat, lng=lng)
        for lon, lat in route["geometry"]
    ]
    turn_by_turn = route["turn_by_turn"]
    distance_km = route["distance_km"]
    traffic_report = route["traffic_report"]

    prediction = predict_plan(
        vehicle_mode=payload.vehicle_mode,
        distance_km=distance_km,
        battery_percent=payload.battery_percent,
    )

    response = PlanRouteResponse(
        status=prediction["status"],
        distance_km=round(distance_km, 2),
        predicted_energy_kwh=prediction["predicted_energy_kwh"],
        final_battery_percent=prediction["final_battery_percent"],
        warning=prediction["warning"],
        traffic_report=traffic_report,
        offline_note="Route is cached for offline review.",
        weather_summary=route.get("weather_summary", "Weather forecast unavailable."),
        geometry=geometry,
        turn_by_turn=turn_by_turn,
        nearby_chargers=route.get("nearby_chargers", []),
        emergency_chargers=route.get("emergency_chargers", []),
        lodges=route.get("lodges", []),
        restaurants=route.get("restaurants", []),
        cache_key=f"route-{user['id']}-{int(route['duration_s'])}",
    )

    # Persist to route_history (best-effort).
    try:
        get_service_client().table("route_history").insert(
            {
                "user_id": user["id"],
                "start": payload.start,
                "destination": payload.destination,
                "vehicle_mode": payload.vehicle_mode,
                "battery_percent": payload.battery_percent,
                "response": response.model_dump(),
            }
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to persist route history: %s", exc)

    return response


@router.get("/history", response_model=List[PlanRouteResponse])
def list_history(
    limit: int = 20,
    user: dict = Depends(current_user),
) -> List[PlanRouteResponse]:
    client = get_service_client()
    result = (
        client.table("route_history")
        .select("response, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [PlanRouteResponse(**row["response"]) for row in (result.data or [])]
