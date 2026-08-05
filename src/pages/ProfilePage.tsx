import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Save, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getDriverProfile, saveDriverProfile, session } from "@/lib/api";
import { LANGUAGES, VEHICLES } from "@/data/vehicles";
import type { DriverProfile, VehicleMode } from "@/types";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleMode, setVehicleMode] = useState<VehicleMode>("car");
  const [language, setLanguage] = useState("en-IN");
  const [battery, setBattery] = useState(80);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const phone = session.getPhone();
    if (!phone) {
      navigate("/login", { replace: true });
      return;
    }
    getDriverProfile(phone).then((data) => {
      setProfile(data);
      setName(data.name);
      setVehicleNumber(data.vehicle_number ?? "");
      setVehicleMode(data.vehicle_mode);
      setLanguage(data.language);
      setBattery(data.battery_percent);
    });
  }, [navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      const next: DriverProfile = {
        ...profile,
        name,
        vehicle_number: vehicleNumber,
        vehicle_mode: vehicleMode,
        language,
        battery_percent: battery,
      };
      await saveDriverProfile(next);
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Driver profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">These defaults are applied to every new plan.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input id="profile-phone" value={profile.phone_number} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-vehicle">Vehicle number</Label>
              <Input
                id="profile-vehicle"
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value.toUpperCase())}
                placeholder="TN 10 AB 1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Default vehicle mode</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-language">Language</Label>
              <select
                id="profile-language"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-battery">Default battery %</Label>
              <Input
                id="profile-battery"
                type="number"
                min={1}
                max={100}
                value={battery}
                onChange={(event) => setBattery(Number(event.target.value) || 80)}
              />
            </div>

            {message && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                {message}
              </div>
            )}

            <Button type="submit" disabled={saving} className="h-12 w-full">
              <Save className="h-5 w-5" />
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
