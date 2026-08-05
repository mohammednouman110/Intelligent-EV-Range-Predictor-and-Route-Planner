import { Bike, Bus, Car, Truck, type LucideIcon } from "lucide-react";
import type { VehicleMode } from "@/types";

export type VehicleDef = {
  mode: VehicleMode;
  label: string;
  icon: LucideIcon;
  capacity: number; // kWh reference
};

export const VEHICLES: VehicleDef[] = [
  { mode: "scooter", label: "Scooter", icon: Bike, capacity: 3 },
  { mode: "car", label: "Car", icon: Car, capacity: 60 },
  { mode: "truck", label: "Truck", icon: Truck, capacity: 180 },
  { mode: "bus", label: "Bus", icon: Bus, capacity: 260 },
];

export const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "bn-IN", label: "Bengali" },
];
