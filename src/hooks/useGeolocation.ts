import { useState } from "react";
import type { SourcePoint } from "@/types";

export function useGeolocation() {
  const [status, setStatus] = useState("Location not shared yet");
  const [point, setPoint] = useState<SourcePoint>(null);

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      return;
    }
    setStatus("Waiting for location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        setPoint(next);
        setStatus(`Tracking from ${next.lat}, ${next.lng}`);
      },
      () => setStatus("Location permission denied. Enter a source manually."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { status, point, setPoint, setStatus, locate };
}
