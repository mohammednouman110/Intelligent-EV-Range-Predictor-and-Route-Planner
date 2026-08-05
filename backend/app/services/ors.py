"""Thin OpenRouteService client.

We use the public Directions API for routing. Profiles map 1:1 onto the
frontend's `VehicleMode`. Geocoding is via Pelias.
Docs: https://openrouteservice.org/dev/#/api-docs
"""

from typing import Dict, List, Tuple

import httpx


class ORSError(RuntimeError):
    pass


_VEHICLE_PROFILE = {
    "scooter": "driving-car",   # ORS has no scooter profile
    "car": "driving-car",
    "truck": "driving-hgv",
    "bus": "driving-hgv",       # ORS has no dedicated bus profile; hgv is closest
}


class ORSClient:
    BASE = "https://api.openrouteservice.org"

    def __init__(self, api_key: str, http_client: httpx.Client):
        self._key = api_key
        self._http = http_client

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": self._key, "Content-Type": "application/json"}

    def geocode(self, text: str) -> Tuple[float, float]:
        """Return (lat, lng) for a free-form address."""
        if not text:
            raise ORSError("empty geocode query")
        resp = self._http.get(
            f"{self.BASE}/geocode/search",
            params={"text": text, "size": 1},
            headers=self._headers(),
        )
        if resp.status_code != 200:
            raise ORSError(f"geocode {resp.status_code}: {resp.text}")
        feats = resp.json().get("features") or []
        if not feats:
            raise ORSError(f"no results for {text!r}")
        lon, lat = feats[0]["geometry"]["coordinates"]
        return lat, lon

    def directions(
        self,
        coordinates: List[List[float]],
        vehicle_mode: str,
    ) -> Dict:
        """Call ORS Directions and return a normalized dict."""
        profile = _VEHICLE_PROFILE.get(vehicle_mode, "driving-car")
        body = {"coordinates": coordinates, "instructions": True, "geometry": True}
        resp = self._http.post(
            f"{self.BASE}/v2/directions/{profile}/geojson",
            json=body,
            headers=self._headers(),
        )
        if resp.status_code != 200:
            raise ORSError(f"directions {resp.status_code}: {resp.text}")
        feature = (resp.json().get("features") or [None])[0]
        if not feature:
            raise ORSError("ORS returned no features")
        props = feature["properties"]["summary"]
        steps = feature["properties"]["segments"][0]["steps"]
        turn_by_turn = []
        for step in steps:
            instruction = step.get("instruction", "")
            distance = step.get("distance", 0) / 1000.0
            turn_by_turn.append(f"{instruction} ({distance:.1f} km)" if instruction else f"Continue for {distance:.1f} km")

        traffic_report = (
            f"Estimated duration {props['duration'] / 60:.1f} min over {props['distance'] / 1000:.1f} km."
        )

        return {
            "geometry": feature["geometry"]["coordinates"],  # [[lon, lat], ...]
            "distance_km": props["distance"] / 1000.0,
            "duration_s": props["duration"],
            "turn_by_turn": turn_by_turn,
            "traffic_report": traffic_report,
            "weather_summary": "Weather forecast unavailable (ORS does not provide it).",
            # The frontend also expects these — leave empty for the client to populate
            # from a separate places API later.
            "nearby_chargers": [],
            "emergency_chargers": [],
            "lodges": [],
            "restaurants": [],
        }
