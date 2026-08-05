import { useEffect, useState } from "react";
import { Calendar, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { statusMeta } from "@/lib/format";
import type { PlanRouteResponse } from "@/types";

const STORAGE_KEY = "ev-route-history";

type HistoryEntry = PlanRouteResponse & { savedAt: number };

function loadHistory(): HistoryEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  function clear() {
    saveHistory([]);
    setItems([]);
  }

  function remove(index: number) {
    const next = items.filter((_, idx) => idx !== index);
    saveHistory(next);
    setItems(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trip history</h2>
          <p className="text-sm text-muted-foreground">Routes you have planned in this browser.</p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={clear}>
            <Trash2 className="h-4 w-4" /> Clear all
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center text-muted-foreground">
            <Calendar className="h-8 w-8" />
            <p className="font-medium text-foreground">No saved routes yet</p>
            <p className="text-sm">Plan a route on the planner page to see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => {
            const meta = statusMeta(item.status);
            const Icon = meta.icon;
            return (
              <Card key={`${item.cache_key ?? index}`} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                      {meta.label}
                    </span>
                    <Badge variant="outline">{new Date(item.savedAt).toLocaleString()}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {item.distance_km.toFixed(1)} km · {item.predicted_energy_kwh.toFixed(1)} kWh · {item.final_battery_percent.toFixed(0)}%
                  </p>
                  <p className="text-foreground">{item.turn_by_turn[0]}</p>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
