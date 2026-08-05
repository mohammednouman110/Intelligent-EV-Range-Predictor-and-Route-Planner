export type VehicleMode = "scooter" | "car" | "truck" | "bus";

export type NearbyPlace = {
  category: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  note: string;
};

export type PlanRouteResponse = {
  status: "green" | "yellow" | "red";
  distance_km: number;
  predicted_energy_kwh: number;
  final_battery_percent: number;
  warning: string | null;
  traffic_report: string;
  offline_note: string;
  weather_summary: string;
  geometry: Array<{ lat: number; lng: number }>;
  turn_by_turn: string[];
  nearby_chargers: NearbyPlace[];
  emergency_chargers: NearbyPlace[];
  lodges: NearbyPlace[];
  restaurants: NearbyPlace[];
  cache_key: string | null;
};

export type DriverProfile = {
  name: string;
  phone_number: string;
  vehicle_number: string | null;
  vehicle_mode: VehicleMode;
  language: string;
  battery_percent: number;
};

export type StopInput = {
  id: number;
  label: string;
  address: string;
};

export type SourcePoint = { lat: number; lng: number } | null;
