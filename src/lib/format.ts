import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { PlanRouteResponse } from "@/types";

export type StatusMeta = {
  label: string;
  color: string;
  mapColor: string;
  icon: typeof AlertTriangle;
};

export function statusMeta(status: PlanRouteResponse["status"]): StatusMeta {
  if (status === "red") {
    return { label: "Charging Required", color: "hsl(var(--destructive))", mapColor: "#dc2626", icon: AlertTriangle };
  }
  if (status === "yellow") {
    return { label: "Charge Recommended", color: "hsl(var(--ev-warning))", mapColor: "#eab308", icon: AlertTriangle };
  }
  return { label: "Trip Feasible", color: "hsl(var(--primary))", mapColor: "#16a34a", icon: CheckCircle2 };
}

export function extractWeather(summary?: string) {
  if (!summary) return { temp: "-", wind: "-", rain: "-" };
  const temp = summary.match(/temperature\s+(-?\d+(?:\.\d+)?)/i)?.[1];
  const wind = summary.match(/wind\s+(-?\d+(?:\.\d+)?)/i)?.[1];
  const rain = summary.match(/rain\s+(-?\d+(?:\.\d+)?)/i)?.[1];
  return {
    temp: temp ? `${temp} C` : "-",
    wind: wind ? `${wind} km/h` : "-",
    rain: rain ? `${rain} mm/hr` : "-",
  };
}
