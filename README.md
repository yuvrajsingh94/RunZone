# 🏃 RunZone

> **Turn your real-world miles into territory conquest — without burning out.**  
> An open-source endurance platform combining **PostGIS geospatial territory capture**, **sports-science injury prevention (ACWR)**, and an **AI running coach**.

---

## 💡 What is RunZone?

Running apps usually fall into two camps: dry data trackers that feel like spreadsheets, or gimmicky games disconnected from real athletic physiology. 

**RunZone bridges the gap:**
1. **Every run captures real territory:** Your outdoor GPS track gets converted into a 40-meter territory corridor on a live 3D map.
2. **Your body is protected:** Real-time **ACWR (Acute:Chronic Workload Ratio)** and **HRV morning readiness** monitoring keep you progressing without injury.
3. **Your city stays alive:** Unrun sectors gradually decay over time, keeping the leaderboard active, dynamic, and fair for newcomers.
4. **An AI coach that actually knows running:** Voice and chat briefings calibrated to your exact cardiovascular limits and training phase.

---

## ✨ Key Features

### 🗺️ PostGIS Territory Conquest & Dynamic Decay
- **40m Corridor Buffer:** GPS routes are buffered in PostGIS (`ST_Buffer` on `EPSG:3857`) and mapped to city sectors.
- **Sector Decay Engine:** Claimed sectors unrun for more than 7 days lose 15 defense points daily. At 0 points, they become neutral and open for conquest.
- **Live Faction War Room:** Choose from 4 factions (*Cinder Legion, Contour Vanguard, Nordic Blue, Amber Division*) and fight for map dominance in weekly seasons.

### 🛡️ ACWR Injury Prevention & Recovery Hub
- **Dr. Tim Gabbett ACWR Model:** Compares your Acute Load (past 7 days) against your Chronic Base (past 28 days) to flag overtraining spikes before they become tendonitis or stress fractures.
- **HRV & Autonomic Readiness:** Log or sync your morning HRV (rMSSD), resting heart rate, and sleep quality to calculate your daily recovery score ($0-100\%$).

### 🧠 ZoneCoach AI (Voice + Chat)
- Built on high-speed LLM inference with built-in sports medicine guardrails.
- Enforces cardiovascular ceilings for runners with elevated heart conditions.
- Generates 4-to-16 week periodized training plans (5K, 10K, Half, Marathon).

### ⚡ Strava Webhooks & GPX Ingestion
- Real-time Strava OAuth2 push notifications automatically ingest runs into the map within seconds.
- Native GPX / TCX file parser with elevation gain and pacing analytics.
- Desktop simulation mode for testing GPS routes without leaving your desk.

---

## 🚀 Quick Start Guide

### Option 1: Docker (Fastest)

```bash
# Clone the repository
git clone https://github.com/<your-username>/RunZone.git
cd RunZone

# Start Postgres/PostGIS, FastAPI backend, and React frontend
docker compose up --build
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173) (or `5174`)
- **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Local Development Setup

#### 1. Backend (FastAPI + Python 3.11+)

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React 19 + Vite + Tailwind)

```bash
cd frontend

# Install packages
npm install

# Launch Vite dev server
npm run dev
```

---

## 🏗️ Architecture & Project Structure

```
RunZone/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # REST controllers (auth, activities, territories, coach, analytics)
│   │   ├── core/                 # Config, async database engine, JWT & security, WebSockets
│   │   ├── models/               # SQLAlchemy models (User, Activity, TerritoryZone, DailyMetric, Season)
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Core engines:
│   │   │   ├── spatial_service.py         # PostGIS 40m corridor buffering & spatial queries
│   │   │   ├── acwr_service.py            # Acute:Chronic Workload Ratio calculations
│   │   │   ├── biometrics_service.py      # Composite HRV & recovery score algorithm
│   │   │   ├── territory_decay_service.py # Automated scheduled sector decay sweep
│   │   │   ├── gamification_service.py    # XP leveling formula & faction standings
│   │   │   ├── llm_coach_service.py       # AI ZoneCoach & periodized training generator
│   │   │   ├── strava_service.py          # Strava OAuth2 & push webhook processor
│   │   │   └── email_service.py           # Verification & reset password transactional mailer
│   │   └── main.py               # Lifespan startup, auto-seeding & APScheduler
│   └── tests/                    # Comprehensive unit tests for all math, decay, and auth
├── frontend/
│   ├── src/
│   │   ├── components/           # MapLibre 3D maps, biometrics charts, audio coach, HUDs
│   │   ├── pages/                # Territory War Room, Coach Hub, Analytics, Leaderboard
│   │   ├── services/api.ts       # Type-safe API client
│   │   └── context/AuthContext.tsx # Authentication & athlete state
└── docker-compose.yml            # Multi-container orchestration
```

---

## 🧪 Running Unit Tests

Run the test suite to verify math formulas, decay calculations, and authentication:

```bash
cd backend
pytest -v
```

---

## 🔒 Security & Privacy

- **JWT Tokens:** 15-minute short-lived access tokens + 7-day rotated refresh tokens with SHA-256 fingerprinting.
- **IDOR Protection:** Resource ownership validation across all activity and athlete endpoints.
- **Health Guardrails:** Medical constraints are strictly enforced in AI training plan generation.
- **Privacy Zones:** User coordinates are processed locally and stored in standard WGS84 format.

---

## 📄 License

MIT License — Built with ❤️ for athletes and runners everywhere.
