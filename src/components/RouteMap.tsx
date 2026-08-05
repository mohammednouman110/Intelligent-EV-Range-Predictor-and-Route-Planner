import { useEffect, useRef } from "react";
import type { NearbyPlace, VehicleMode } from "@/types";

type Coords = { lat: number; lng: number };

type Props = {
  coords: Coords[];
  color: string;
  vehicleMode: VehicleMode;
  places: NearbyPlace[];
};

declare global {
  interface Window {
    google?: any;
    initMap?: () => void;
  }
}

const API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_KEY as string | undefined;

/**
 * Lightweight Google Maps embedder. If a Google Maps key is present we
 * render a real map; otherwise we fall back to an SVG visualisation so the
 * page is still useful in local development.
 */
export function RouteMap({ coords, color, places }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!API_KEY || !ref.current) return;
    if (window.google?.maps) {
      initMap();
      return;
    }
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      window.initMap = initMap;
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap`;
    script.async = true;
    window.initMap = initMap;
    document.head.appendChild(script);
    function initMap() {
      if (!ref.current || !window.google) return;
      const map = new window.google.maps.Map(ref.current, {
        zoom: 8,
        center: coords[0] ?? { lat: 23.5, lng: 87.3 },
      });
      if (coords.length > 1) {
        new window.google.maps.Polyline({
          path: coords,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 1,
          strokeWeight: 4,
          map,
        });
      }
      places.forEach((place) => {
        new window.google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: place.name,
        });
      });
    }
  }, [coords, color, places]);

  if (API_KEY) {
    return <div ref={ref} className="h-full w-full" />;
  }
  return <FallbackMap coords={coords} color={color} />;
}

function FallbackMap({ coords, color }: { coords: Coords[]; color: string }) {
  if (coords.length === 0) {
    return <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">No geometry</div>;
  }
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = (maxLat - minLat || 0.05) * 0.2;
  const padLng = (maxLng - minLng || 0.05) * 0.2;
  const project = (c: Coords) => {
    const x = ((c.lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 100;
    const y = (1 - (c.lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 100;
    return { x, y };
  };
  const points = coords.map((c) => project(c));
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-emerald-50 to-sky-100">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline fill="none" stroke={color} strokeWidth="0.8" points={path} />
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="1" fill={color} />
        ))}
      </svg>
      <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
        Route preview (add VITE_GOOGLE_MAPS_KEY to enable Google Maps)
      </div>
    </div>
  );
}
