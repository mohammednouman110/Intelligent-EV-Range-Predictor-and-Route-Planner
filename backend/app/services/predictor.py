"""Pure-function range predictor — extracted so it's easy to swap for an ML model."""

from typing import Dict


# kWh/km assumptions; mirrors the energy factor that lived in src/lib/api.ts.
_ENERGY_FACTOR = {
    "scooter": 0.05,
    "car": 0.18,
    "truck": 1.6,
    "bus": 1.8,
}

# Reference battery capacity in kWh; this is what battery_percent maps onto.
_REFERENCE_CAPACITY_KWH = 60.0


def predict_plan(vehicle_mode: str, distance_km: float, battery_percent: int) -> Dict:
    factor = _ENERGY_FACTOR.get(vehicle_mode, 0.18)
    energy_kwh = distance_km * factor
    available_kwh = _REFERENCE_CAPACITY_KWH * (battery_percent / 100.0)
    used_ratio = energy_kwh / _REFERENCE_CAPACITY_KWH
    final_percent = max(0.0, min(100.0, battery_percent - used_ratio * 100))

    if final_percent < 15:
        status = "red"
        warning = "Battery will be low. Plan a charging stop."
    elif final_percent < 35:
        status = "yellow"
        warning = None
    else:
        status = "green"
        warning = None

    # If the trip needs more energy than the battery holds, surface it.
    if energy_kwh > available_kwh:
        warning = (
            f"Trip requires {energy_kwh:.1f} kWh but battery only holds "
            f"{available_kwh:.1f} kWh. Recharge en route."
        )
        status = "red"

    return {
        "status": status,
        "predicted_energy_kwh": round(energy_kwh, 2),
        "final_battery_percent": round(final_percent, 1),
        "warning": warning,
    }
