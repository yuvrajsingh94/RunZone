# 🏃‍♂️ RunZone — AI-Powered Geospatial Running SaaS Platform

> A production-ready, SaaS-grade endurance platform combining **PostGIS** territory-capture polygon buffers, **Acute:Chronic Workload Ratio (ACWR)** deterministic sports injury modeling, **LLM-powered coaching**, and **Strava OAuth2 sync**.

---

## ⚡ Tech Stack & Architecture

- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), GeoAlchemy2, Shapely, Pydantic v2, JWT (HS256), Bcrypt.
- **Database & Spatial Engine**: PostgreSQL 16 with **PostGIS 3.4** extension (`ST_Buffer`, `ST_Intersects`, `ST_Difference`, `ST_Area`, and **GiST spatial indexing** for sub-100ms polygon overlap detection).
- **AI & Analytics**: Hybrid ACWR injury prevention mathematical engine (Dr. Tim Gabbett model) + Google Gemini LLM ZoneCoach.
- **Frontend**: React 19, TypeScript, Tailwind CSS, Leaflet & React-Leaflet (CartoDB Dark Matter tiles), Recharts (Dual-axis load trends), Framer Motion, Lucide Icons.
- **DevOps**: Multi-container Docker & Docker Compose (`db` + `backend` + `frontend`).

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone or navigate to the directory
cd RunZone

# 2. Start all services with Docker Compose (PostGIS, FastAPI, React)
docker compose up --build
```

- **Frontend HUD**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PostGIS Database**: `localhost:5432` (`runzone_db`)

---

## 📂 Project Structure

```
RunZone/
├── docker-compose.yml             # PostGIS, FastAPI, and React services
├── .env.example                   # Environment configuration template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt           # FastAPI, GeoAlchemy2, Shapely, Pydantic v2
│   ├── scripts/
│   │   └── init_postgis.sql       # PostGIS spatial extension bootstrap
│   ├── app/
│   │   ├── main.py                # FastAPI app entrypoint & auto-seeding
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings
│   │   │   ├── database.py        # Async SQLAlchemy 2.0 Engine & Sessions
│   │   │   └── security.py        # Bcrypt & JWT Access Tokens
│   │   ├── models/                # SQLAlchemy + GeoAlchemy2 Models
│   │   │   ├── user.py            # Athlete profile, levels, and Faction color
│   │   │   ├── activity.py        # GPS tracks, LineStrings, TRIMP workload
│   │   │   ├── territory.py       # PostGIS Polygons & Capture logs
│   │   │   └── daily_metric.py    # Rolling ACWR daily snapshots
│   │   ├── schemas/               # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── spatial_service.py # PostGIS ST_Buffer & ST_Intersects engine
│   │   │   ├── acwr_service.py    # Acute (7D) vs Chronic (28D) load engine
│   │   │   ├── llm_coach_service.py # Gemini & sports physiology briefing
│   │   │   └── strava_service.py  # OAuth2 connect & polyline decode
│   │   ├── api/v1/endpoints/      # REST API Controllers (Auth, Activities, Territories, ACWR, Coach, Leaderboard, Strava)
│   │   └── utils/
│   │       └── geo_helpers.py     # Haversine distance, GPX parser, simulator
│   └── tests/
│       ├── test_acwr.py           # Unit tests for ACWR formulas
│       └── test_spatial.py        # Unit tests for geodesic buffer & Haversine
└── frontend/
    ├── Dockerfile
    ├── package.json               # React 19, Leaflet, Recharts, Tailwind
    ├── vite.config.ts
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx                # App routes & global modals
    │   ├── context/AuthContext.tsx# Athlete state & 1-click demo login
    │   ├── services/api.ts        # Type-safe API client
    │   ├── components/
    │   │   ├── layout/            # Top Navbar & Sidebar HUD
    │   │   ├── map/               # React-Leaflet Dark CartoDB Map
    │   │   ├── analytics/         # SVG ACWR Semi-circle Gauge & Recharts Timeline
    │   │   ├── coach/             # Daily Briefing Card & AI Chat Drawer
    │   │   └── activity/          # GPS Simulation, GPX Upload & Manual Modals
    │   └── pages/
    │       ├── Dashboard.tsx      # Overview Command Center
    │       ├── TerritoryWarRoom.tsx# PostGIS Full War Room & Sector Inspector
    │       ├── AnalyticsPage.tsx  # ACWR Matrix & Fatigue Breakdown
    │       ├── CoachHubPage.tsx   # ZoneCoach Conversational Interface
    │       ├── LeaderboardPage.tsx# Faction Rankings & Top-3 Podium
    │       ├── ActivitiesPage.tsx # Workout Splits & GPS History
    │       ├── ProfilePage.tsx    # Strava Connect & HR Zones
    │       ├── LoginPage.tsx      # Sign In & Demo Access
    │       └── RegisterPage.tsx   # Sign Up
```

---

## 🧠 Scientific Formula: Acute:Chronic Workload Ratio (ACWR)

$$\text{ACWR} = \frac{\text{Acute Workload (Past 7 Days Rolling Load)}}{\text{Chronic Workload (Past 28 Days Rolling Average)}}$$

| ACWR Value | Risk Category | Physiological Interpretation |
| :--- | :--- | :--- |
| **$< 0.80$** | **Under-Training** | Safe from overtraining injury, but aerobic base is detraining. |
| **$0.80 - 1.30$** | **Sweet Spot (Optimal)** | **Optimal conditioning zone**; lowest injury probability (~10-15%). |
| **$1.30 - 1.50$** | **Overreaching** | Caution; fatigue spike elevates soft-tissue strain risk (~50%). |
| **$> 1.50$** | **Danger Zone** | **2x-4x spike in injury risk**; scheduled recovery run/rest required. |

---

## 🗺️ Geospatial Territory Engine (PostGIS)

1. When a runner finishes a run (or simulates a GPS route), their coordinate stream is projected to planar meters (`EPSG:3857`).
2. PostGIS generates an exact $40\text{m}$ corridor buffer using `ST_Buffer(ST_Transform(geom, 3857), 40)`.
3. Spatial intersection queries check for contested competitor polygons using `ST_Intersects` backed by **GiST spatial indexing** for $<100\text{ms}$ query response.
4. Overlapping claimed area is calculated with `ST_Area` and rewarded as territory score ($km^2$) on the faction leaderboard.
