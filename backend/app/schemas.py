"""Pydantic request/response models — mirror the frontend src/types.ts."""

from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field

VehicleMode = Literal["scooter", "car", "truck", "bus"]


# ---------------- Auth ----------------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    email: EmailStr
    access_token: str
    refresh_token: str
    expires_in: int


# ---------------- Profile ----------------

class ProfileIn(BaseModel):
    name: str
    phone_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_mode: VehicleMode = "car"
    language: str = "en-IN"
    battery_percent: int = Field(80, ge=0, le=100)


class ProfileOut(ProfileIn):
    user_id: str


# ---------------- Route planning ----------------

class SourcePoint(BaseModel):
    lat: float
    lng: float


class StopInput(BaseModel):
    id: int
    label: str
    address: str


class NearbyPlace(BaseModel):
    category: str
    name: str
    lat: float
    lng: float
    distance_km: float
    note: str


class PlanRouteRequest(BaseModel):
    name: str
    phone_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_mode: VehicleMode
    start: str
    destination: str
    source_point: Optional[SourcePoint] = None
    stops: List[StopInput] = Field(default_factory=list)
    battery_percent: int = Field(ge=0, le=100)


class PlanRouteResponse(BaseModel):
    status: Literal["green", "yellow", "red"]
    distance_km: float
    predicted_energy_kwh: float
    final_battery_percent: float
    warning: Optional[str]
    traffic_report: str
    offline_note: str
    weather_summary: str
    geometry: List[SourcePoint]
    turn_by_turn: List[str]
    nearby_chargers: List[NearbyPlace]
    emergency_chargers: List[NearbyPlace]
    lodges: List[NearbyPlace]
    restaurants: List[NearbyPlace]
    cache_key: Optional[str]
