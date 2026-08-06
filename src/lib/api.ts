import type { DriverProfile, PlanRouteResponse, SourcePoint, StopInput, VehicleMode } from "@/types";

/**
 * Thin client for the FastAPI backend (see /backend).
 * Set VITE_API_BASE_URL in .env.local, e.g. http://localhost:8000
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "ev-driver-token";
const PHONE_KEY = "ev-driver-phone"; // kept for HistoryPage/ProfilePage compatibility

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type AuthResult = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email: string;
  user_id: string;
};

function getToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  // Treat placeholder strings ("null", "undefined", whitespace) as no token at all.
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return raw;
}

function _isJwt(value: string): boolean {
  return value.split(".").length === 3 && value.split(".").every((segment) => segment.length > 0);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore body parse errors, use the generic detail
    }
    // Any 401 means the stored token is dead — drop it so the next request is anonymous.
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as unknown as T;
  return (await response.json()) as T;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  return request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logOut(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(PHONE_KEY);
}

function persistAuth(result: AuthResult): void {
  if (!_isJwt(result.access_token)) return;
  localStorage.setItem(TOKEN_KEY, result.access_token);
  sessionStorage.setItem(PHONE_KEY, result.email);
}

export async function planRoute(input: {
  name: string;
  phone_number: string;
  vehicle_number: string;
  vehicle_mode: VehicleMode;
  start: string;
  destination: string;
  source_point: SourcePoint;
  stops: StopInput[];
  battery_percent: number;
}): Promise<PlanRouteResponse> {
  return request<PlanRouteResponse>("/routes/plan", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      stops: input.stops.filter((s) => s.address.trim()),
    }),
  });
}

export async function getDriverProfile(_phoneNumber: string): Promise<DriverProfile> {
  // _phoneNumber kept for backward-compat — backend identifies by JWT, not phone.
  const data = await request<{
    user_id: string;
    name: string;
    phone_number: string | null;
    vehicle_number: string | null;
    vehicle_mode: VehicleMode;
    language: string;
    battery_percent: number;
    email?: string;
  }>("/profile");
  return {
    name: data.name,
    phone_number: data.phone_number ?? "",
    vehicle_number: data.vehicle_number,
    vehicle_mode: data.vehicle_mode,
    language: data.language,
    battery_percent: data.battery_percent,
  };
}

export async function saveDriverProfile(profile: DriverProfile): Promise<DriverProfile> {
  return request<DriverProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

export async function getLastRoute(_phoneNumber: string): Promise<PlanRouteResponse | null> {
  await wait(50);
  const raw = localStorage.getItem("ev-last-route");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlanRouteResponse;
  } catch {
    return null;
  }
}

export function saveLastRoute(response: PlanRouteResponse) {
  localStorage.setItem("ev-last-route", JSON.stringify(response));
}

export async function getHistory(): Promise<PlanRouteResponse[]> {
  return request<PlanRouteResponse[]>("/routes/history");
}

/**
 * Session helpers — kept so ProtectedRoute / history pages keep working.
 * `getPhone()` now returns the authenticated email; `setPhone` is internal.
 */
export const session = {
  getPhone: () => sessionStorage.getItem(PHONE_KEY),
  setPhone: (value: string) => sessionStorage.setItem(PHONE_KEY, value),
  getToken,
  clear: clearSession,
  // Auth-aware: stores JWT + email on successful sign-in/up.
  onAuthenticated: (result: AuthResult) => persistAuth(result),
};
