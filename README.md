# Intelligent EV Range Predictor & Route Planner

A web app that helps EV drivers plan trips with weather-aware range
predictions, traffic estimates, and nearby charging, lodging and restaurant
discovery. The Vite + React front-end calls a FastAPI + Supabase back-end;
the range math is local, the routing comes from OpenRouteService.

```
Intelligent-EV-Range-Predictor-and-Route-Planner/
├── src/                 React + TypeScript front-end (Vite)
├── backend/             FastAPI service (auth, profile, route planning)
├── index.html           Vite entry
├── package.json         Front-end deps + scripts
└── README.md            (this file)
```

## Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite 7, Tailwind 3, React Router 6 |
| Backend  | FastAPI, Pydantic, Supabase (Postgres + Auth + RLS)   |
| Routing  | OpenRouteService — geocode + directions                |
| Storage  | Supabase `drivers`, `route_history` (RLS-enabled)     |

## Pages

| Path        | Component        | Purpose                                                |
| ----------- | ---------------- | ------------------------------------------------------ |
| `/login`    | `LoginPage`      | Sign in or register with email + password (Supabase)   |
| `/`         | `PlannerPage`    | Main EV route planner                                  |
| `/history`  | `HistoryPage`    | Previously planned routes                              |
| `/profile`  | `ProfilePage`    | Edit driver profile & defaults                         |

A short-cut header plus protected-route gating live in
`src/components/layout/`.

## Getting started

You need **two** things running: the FastAPI backend (port `8000`) and the Vite
dev server (port `5173`).

### 1. Backend (FastAPI + Supabase)

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate          # Windows Git Bash
# or:  source .venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
cp .env.example .env              # then fill in real values
```

Fill these in `backend/.env`:

| Variable                    | Where to get it                                       |
| --------------------------- | ----------------------------------------------------- |
| `SUPABASE_URL`              | Supabase → Project Settings → API → Project URL      |
| `SUPABASE_ANON_KEY`         | Supabase → Project Settings → API → `anon` `public`   |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role`    |
| `ORS_API_KEY`               | <https://openrouteservice.org/dev/#/signup>           |

Apply the schema once in the Supabase SQL editor:

```bash
# copy the contents of backend/schema.sql into the SQL editor and run
```

Then start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs at <http://localhost:8000/docs>.

### 2. Frontend (Vite + React)

From the project root:

```bash
npm install
cp .env.example .env.local       # then edit if needed
npm run dev
```

Open <http://localhost:5173>.

`VITE_API_BASE_URL` defaults to `http://localhost:8000`; change it in
`.env.local` if the backend runs elsewhere.

### Optional: Google Maps

`src/components/RouteMap.tsx` uses Google Maps when `VITE_GOOGLE_MAPS_KEY` is
set; otherwise an SVG fallback renders so the rest of the UI still works.

```bash
# .env.local
VITE_GOOGLE_MAPS_KEY=your-key
```

## Environment variables

### Frontend — `.env.local`

| Variable                  | Purpose                                     | Default                  |
| ------------------------- | ------------------------------------------- | ------------------------ |
| `VITE_API_BASE_URL`       | Backend base URL                            | `http://localhost:8000`  |
| `VITE_GOOGLE_MAPS_KEY`    | Enable Google Maps in `RouteMap` (optional) | unset → SVG fallback     |

### Backend — `backend/.env`

| Variable                       | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `SUPABASE_URL`                 | Supabase project URL                                     |
| `SUPABASE_ANON_KEY`            | Supabase anonymous JWT (verification)                    |
| `SUPABASE_SERVICE_ROLE_KEY`    | Server-only key used for signup + JWT verification        |
| `ORS_API_KEY`                  | OpenRouteService API key                                 |
| `API_HOST` / `API_PORT`        | Optional uvicorn binding                                 |
| `CORS_ORIGINS`                 | Comma-separated list, e.g. `http://localhost:5173`       |

## API endpoints

| Method | Path              | Auth | Purpose                                  |
| ------ | ----------------- | ---- | ---------------------------------------- |
| POST   | `/auth/signup`    | no   | Create Supabase user, return JWT         |
| POST   | `/auth/login`     | no   | Email + password sign-in, return JWT     |
| POST   | `/auth/logout`    | yes  | Stateless logout                         |
| GET    | `/auth/me`        | yes  | Current user                             |
| GET    | `/profile`        | yes  | Driver profile                           |
| PUT    | `/profile`        | yes  | Upsert driver profile                    |
| POST   | `/routes/plan`    | yes  | ORS-routed plan + energy prediction      |
| GET    | `/routes/history` | yes  | Current user's last routes               |
| GET    | `/health`         | no   | Liveness probe                           |

## Project layout

```
src/
  App.tsx                      routes
  main.tsx                     entry
  types.ts                     shared TS types
  data/vehicles.ts             vehicle + language constants
  lib/
    api.ts                     auth + route API client
    format.ts                  status/weather helpers
    utils.ts                   cn() helper
  hooks/
    useGeolocation.ts          geolocation hook
    useSpeechRecognition.ts    voice input hook
  components/
    RouteMap.tsx               Google Maps + SVG fallback
    layout/
      AppLayout.tsx            header + nav + outlet
      ProtectedRoute.tsx       auth guard
    ui/                        Button, Card, Input, Label, Slider, Badge
  pages/
    LoginPage.tsx
    PlannerPage.tsx
    HistoryPage.tsx
    ProfilePage.tsx

backend/
  app/
    main.py                    FastAPI app, CORS, router wiring
    config.py                  pydantic-settings env loader
    deps.py                    Supabase clients + JWT auth dependency
    schemas.py                 request/response models
    supabase_client.py         service-role client cache
    routers/
      auth.py                  /auth/signup, /auth/login, …
      profile.py               /profile GET, PUT
      routes.py                /routes/plan, /routes/history
    services/
      ors.py                   OpenRouteService geocode + directions
      predictor.py             range / energy / status math
  schema.sql                   Supabase tables + RLS policies
  requirements.txt
  .env.example
```

## Scripts

```bash
# frontend
npm run dev          # vite dev server
npm run build        # type-check + production build
npm run preview      # serve built output locally

# backend
uvicorn app.main:app --reload   # local dev
```

## Troubleshooting

- **"Failed to fetch" on login** — backend isn't running on
  `VITE_API_BASE_URL` (default `:8000`), or CORS doesn't include the Vite
  origin (`http://localhost:5173`).
- **400 `email rate limit exceeded`** — Supabase allows **4 signups/hour/IP**
  by default. Raise it in Supabase → Auth → Rate Limits.
- **400 `Database error saving new user`** — `schema.sql` wasn't applied yet;
  the `drivers` table doesn't exist.
- **`Email not confirmed`** — Supabase has "Confirm email" turned on. Either
  click the email link, or turn it off in Auth → Providers → Email for
  development.
- **`Invalid API key`** — wrong Supabase values, or mixed anon/service-role
  keys.

## License

Private project — no license granted.
