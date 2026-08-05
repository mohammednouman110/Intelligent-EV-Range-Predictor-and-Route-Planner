import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Battery,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  Cloud,
  Download,
  Gauge,
  Hotel,
  Languages,
  Loader2,
  LocateFixed,
  MapPin,
  Mic,
  Navigation,
  Plus,
  Route as RouteIcon,
  TrafficCone,
  Truck,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import {
  getDriverProfile,
  planRoute,
  saveLastRoute,
  session,
} from "@/lib/api";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { extractWeather, statusMeta } from "@/lib/format";
import { LANGUAGES, VEHICLES } from "@/data/vehicles";
import type { DriverProfile, NearbyPlace, PlanRouteResponse, SourcePoint, StopInput, VehicleMode } from "@/types";

const RouteMap = lazy(() => import("@/components/RouteMap").then((m) => ({ default: m.RouteMap })));

export default function PlannerPage() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("car");
  const [start, setStart] = useState("Current location");
  const [destination, setDestination] = useState("Durgapur, India");
  const [battery, setBattery] = useState(80);
  const [stops, setStops] = useState<StopInput[]>([]);
  const [language, setLanguage] = useState("en-IN");
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PlanRouteResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const geo = useGeolocation();
  const sourcePoint: SourcePoint = geo.point;
  const speech = useSpeechRecognition(language);

  useEffect(() => {
    setMounted(true);
    const phone = session.getPhone();
    if (!phone) {
      setError("Please sign in to plan a route.");
      return;
    }
    getDriverProfile(phone)
      .then((data) => {
        setProfile(data);
        setVehicleNumber(data.vehicle_number ?? "");
        setVehicleMode(data.vehicle_mode);
        setLanguage(data.language);
        setBattery(data.battery_percent);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load profile."));
  }, []);

  const activeVehicle = useMemo(
    () => VEHICLES.find((v) => v.mode === vehicleMode) ?? VEHICLES[1],
    [vehicleMode],
  );
  const status = result ? statusMeta(result.status) : null;
  const StatusIcon = status?.icon ?? CheckCircle2;
  const weather = useMemo(() => extractWeather(result?.weather_summary), [result?.weather_summary]);
  const projectedBattery = result ? Math.max(0, Math.min(100, result.final_battery_percent)) : battery;
  const allPlaces: NearbyPlace[] = result
    ? [...result.nearby_chargers, ...result.emergency_chargers, ...result.lodges, ...result.restaurants]
    : [];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setLoading(true);
    try {
      const response = await planRoute({
        name: profile.name,
        phone_number: profile.phone_number,
        vehicle_number: vehicleNumber,
        vehicle_mode: vehicleMode,
        start,
        destination,
        source_point: sourcePoint,
        stops: stops.filter((s) => s.address.trim()).map((s) => ({ label: s.label, address: s.address })),
        battery_percent: battery,
      });
      setResult(response);
      saveLastRoute(response);
      setOfflineSaved(Boolean(response.cache_key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to plan route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <section className="space-y-4">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RouteIcon className="h-5 w-5 text-primary" /> Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" /> Vehicle number
              </Label>
              <Input
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())}
                placeholder="TN 10 AB 1234"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {VEHICLES.map((vehicle) => {
                const Icon = vehicle.icon;
                return (
                  <Button
                    key={vehicle.mode}
                    type="button"
                    variant={vehicleMode === vehicle.mode ? "default" : "outline"}
                    className="h-16 flex-col gap-1"
                    onClick={() => setVehicleMode(vehicle.mode)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{vehicle.label}</span>
                  </Button>
                );
              })}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Battery charge</span>
                <span className="text-2xl font-bold text-primary">{battery}%</span>
              </div>
              <Slider value={[battery]} onValueChange={(value) => setBattery(value[0] ?? 80)} min={1} max={100} step={1} />
              <p className="text-xs text-muted-foreground">{activeVehicle.capacity} kWh reference capacity for this vehicle mode.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-5 w-5 text-primary" /> Route
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Source
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={start}
                    onChange={(event) => {
                      setStart(event.target.value);
                      geo.setPoint(null);
                    }}
                    placeholder="Choose source"
                    required
                  />
                  <Button type="button" variant="outline" size="icon" aria-label="Use location" onClick={geo.locate}>
                    <LocateFixed className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label="Voice source" onClick={() => speech.listen("start", (t) => { setStart(t); geo.setPoint(null); })}>
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{geo.status}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" /> Destination
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="Choose destination"
                    required
                  />
                  <Button type="button" variant="outline" size="icon" aria-label="Voice destination" onClick={() => speech.listen("destination", setDestination)}>
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Stops</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setStops((items) => [...items, { id: Date.now(), label: `Stop ${items.length + 1}`, address: "" }])
                    }
                  >
                    <Plus className="h-4 w-4" /> Add Stop
                  </Button>
                </div>
                {stops.map((stop) => (
                  <div key={stop.id} className="flex gap-2">
                    <Input
                      value={stop.address}
                      onChange={(event) =>
                        setStops((items) =>
                          items.map((item) => (item.id === stop.id ? { ...item, address: event.target.value } : item)),
                        )
                      }
                      placeholder={stop.label}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Remove stop"
                      onClick={() => setStops((items) => items.filter((item) => item.id !== stop.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="flex items-center gap-2 rounded-md border bg-card px-3">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <select
                    className="h-10 flex-1 bg-transparent text-sm outline-none"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    {LANGUAGES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="button" variant="outline" onClick={() => setOfflineSaved(true)}>
                  <Download className="h-4 w-4" /> Offline
                </Button>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {speech.error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {speech.error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-12 w-full">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                {loading ? "Calculating Route" : "Get Route"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <Card className="overflow-hidden border-2">
          <div className="h-[440px] lg:h-[560px]">
            {result && mounted ? (
              <Suspense fallback={<LoadingMap />}>
                <RouteMap coords={result.geometry} color={status?.mapColor ?? "#16a34a"} vehicleMode={vehicleMode} places={allPlaces} />
              </Suspense>
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-muted text-muted-foreground">
                <Navigation className="mb-3 h-10 w-10 text-primary" />
                <p className="font-semibold text-foreground">Allow location or enter source and destination</p>
                <p className="text-sm">Use Streets, Satellite, or Terrain after the route loads.</p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard icon={Cloud} title="Weather" badge="Route">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniMetric label="Temp" value={weather.temp} />
              <MiniMetric label="Wind" value={weather.wind} />
              <MiniMetric label="Rain" value={weather.rain} />
            </div>
          </InfoCard>
          <InfoCard icon={TrafficCone} title="Traffic" badge="Estimate">
            <p className="text-sm text-muted-foreground">{result?.traffic_report ?? "Traffic appears after route calculation."}</p>
          </InfoCard>
          <InfoCard icon={Download} title="Offline" badge={offlineSaved ? "Saved" : "Local"}>
            <p className="text-sm text-muted-foreground">{result?.offline_note ?? "Calculated routes are saved locally for offline review."}</p>
          </InfoCard>
        </div>

        {result && status && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StatusIcon className="h-5 w-5" style={{ color: status.color }} />
                  {status.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Metric icon={Gauge} label="Distance" value={`${result.distance_km.toFixed(1)} km`} />
                  <Metric icon={Zap} label="Energy" value={`${result.predicted_energy_kwh.toFixed(1)} kWh`} />
                  <Metric icon={Battery} label="Battery" value={`${projectedBattery.toFixed(0)}%`} />
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${projectedBattery}%` }} />
                </div>
                {result.warning && (
                  <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-700" />
                    <span>{result.warning}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <activeVehicle.icon className="h-5 w-5 text-primary" /> Turn By Turn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {result.turn_by_turn.map((step, index) => (
                    <li key={`${index}-${step}`} className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {result && (
          <div className="grid gap-4 lg:grid-cols-4">
            <PlaceList title="Emergency" icon={Battery} places={result.emergency_chargers} />
            <PlaceList title="Chargers" icon={Zap} places={result.nearby_chargers} />
            <PlaceList title="Lodges" icon={Hotel} places={result.lodges} />
            <PlaceList title="Restaurants" icon={Utensils} places={result.restaurants} />
          </div>
        )}
      </section>
    </div>
  );
}

function LoadingMap() {
  return (
    <div className="flex h-full items-center justify-center bg-muted">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function InfoCard({ icon: Icon, title, badge, children }: { icon: React.ComponentType<{ className?: string }>; title: string; badge: string; children: React.ReactNode }) {
  return (
    <Card className="border-2">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </span>
          <Badge variant="outline">{badge}</Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="font-mono text-sm font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3 text-center">
      <Icon className="mx-auto mb-1 h-5 w-5 text-primary" />
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PlaceList({ title, icon: Icon, places }: { title: string; icon: React.ComponentType<{ className?: string }>; places: NearbyPlace[] }) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {places.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nearby results found.</p>
        ) : (
          places.slice(0, 3).map((place) => (
            <div key={`${place.category}-${place.name}-${place.lat}`} className="rounded-md bg-muted p-2">
              <p className="text-sm font-semibold">{place.name}</p>
              <p className="text-xs text-muted-foreground">
                {place.distance_km.toFixed(1)} km - {place.note}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
