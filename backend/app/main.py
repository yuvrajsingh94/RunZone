from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.exceptions import setup_exception_handlers
from app.api.v1.api import api_router
from app.models.user import User, UserRole
from app.models.activity import Activity
from app.models.territory import TerritoryZone
from app.core.security import get_password_hash
from app.utils.geo_helpers import generate_simulated_run_track
from app.services.spatial_service import SpatialService
from app.services.acwr_service import ACWRService
from app.services.territory_decay_service import run_scheduled_territory_decay


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure Database Schema is created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed initial demo athlete & rival factions for instant map interaction
    async with AsyncSessionLocal() as db:
        user_check = await db.execute(select(func.count(User.id)))
        count = user_check.scalar()
        if count == 0:
            # Demo Athlete
            demo_athlete = User(
                email="athlete@runzone.ai",
                username="ApexRunner",
                hashed_password=get_password_hash("Password123!"),
                full_name="Alex Mercer",
                role=UserRole.RUNNER.value,
                faction_color="#3B82F6",  # Neon Blue
                level=7,
                xp=6450,
                total_distance_km=142.5,
                total_territory_km2=4.82,
                resting_hr=52,
                max_hr=194,
                avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                is_active=True,
                is_verified=True,
            )
            
            # Rival 1: Crimson Faction
            rival_1 = User(
                email="valkyrie@runzone.ai",
                username="Valkyrie",
                hashed_password=get_password_hash("Password123!"),
                full_name="Elena Rostova",
                role=UserRole.RUNNER.value,
                faction_color="#EF4444",  # Crimson Red
                level=9,
                xp=8900,
                total_distance_km=210.0,
                total_territory_km2=6.15,
                resting_hr=48,
                max_hr=190,
                avatar_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                is_active=True,
                is_verified=True,
            )

            # Rival 2: Cyber Emerald Faction
            rival_2 = User(
                email="phantom@runzone.ai",
                username="PhantomStride",
                hashed_password=get_password_hash("Password123!"),
                full_name="Marcus Vance",
                role=UserRole.RUNNER.value,
                faction_color="#10B981",  # Emerald Green
                level=6,
                xp=5100,
                total_distance_km=118.0,
                total_territory_km2=3.40,
                resting_hr=58,
                max_hr=188,
                avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
                is_active=True,
                is_verified=True,
            )

            # Admin User
            admin_user = User(
                email="admin@runzone.ai",
                username="ZoneCommander",
                hashed_password=get_password_hash("AdminMaster2026!"),
                full_name="Zone System Commander",
                role=UserRole.ADMIN.value,
                faction_color="#8B5CF6",
                level=15,
                xp=15000,
                total_distance_km=500.0,
                total_territory_km2=12.5,
                resting_hr=45,
                max_hr=195,
                avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                is_active=True,
                is_verified=True,
            )

            db.add_all([demo_athlete, rival_1, rival_2, admin_user])
            await db.flush()

            # Seed Past 28 Days of Activities for Demo Athlete
            now = datetime.now(timezone.utc)
            center_lat, center_lon = 37.7749, -122.4194

            # Rival Territories
            rival1_coords = generate_simulated_run_track(center_lat + 0.015, center_lon + 0.01, 6.5)
            await SpatialService.claim_territory(
                db=db,
                user_id=rival_1.id,
                coordinates=rival1_coords,
                buffer_meters=50.0,
                zone_name="North Bay Fortress",
            )

            rival2_coords = generate_simulated_run_track(center_lat - 0.012, center_lon - 0.015, 5.0)
            await SpatialService.claim_territory(
                db=db,
                user_id=rival_2.id,
                coordinates=rival2_coords,
                buffer_meters=45.0,
                zone_name="South Sector Bastion",
            )

            # Athlete Runs across past 28 days
            for day_offset in [26, 23, 21, 18, 15, 12, 9, 6, 4, 2, 0]:
                run_date = now - timedelta(days=day_offset)
                dist_km = 6.0 + (day_offset % 4) * 1.5
                dur_s = int(dist_km * 330)
                coords = generate_simulated_run_track(
                    center_lat + (day_offset * 0.001 - 0.01),
                    center_lon + (day_offset * 0.001 - 0.01),
                    dist_km
                )
                
                workload = ACWRService.calculate_activity_workload(
                    duration_seconds=dur_s,
                    rpe_score=6,
                    avg_heart_rate=150 + (day_offset % 10),
                    resting_hr=demo_athlete.resting_hr,
                    max_hr=demo_athlete.max_hr,
                )

                act = Activity(
                    user_id=demo_athlete.id,
                    title=f"Tempo Run - Sector {28 - day_offset}",
                    activity_type="Run",
                    distance_meters=dist_km * 1000.0,
                    duration_seconds=dur_s,
                    elevation_gain_meters=dist_km * 12.0,
                    avg_speed_mps=round((dist_km * 1000.0) / dur_s, 2),
                    avg_heart_rate=150 + (day_offset % 10),
                    max_heart_rate=175,
                    workload_score=workload,
                    rpe_score=6,
                    geojson_data={"type": "LineString", "coordinates": coords},
                    source="gps_simulation",
                    started_at=run_date,
                )
                db.add(act)
                await db.flush()

                if day_offset <= 6:
                    await SpatialService.claim_territory(
                        db=db,
                        user_id=demo_athlete.id,
                        coordinates=coords,
                        buffer_meters=45.0,
                        activity_id=act.id,
                        zone_name=f"Apex Corridor {28 - day_offset}",
                    )

            await db.commit()

    # Start In-Process Background Scheduler for Daily Territory Decay
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_scheduled_territory_decay,
        trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
        id="daily_territory_decay_sweep",
        name="Daily Territory Decay Sweep (03:00 UTC)",
        replace_existing=True,
    )
    scheduler.start()
    print("[Scheduler] APScheduler started: Daily territory decay sweep registered for 03:00 UTC.")

    yield

    # Clean Scheduler Shutdown
    scheduler.shutdown(wait=False)
    print("[Scheduler] APScheduler shut down cleanly.")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade Geospatial Running SaaS Platform with PostGIS Territory Capture and ACWR Injury Prevention Engine.",
    lifespan=lifespan,
)

# Centralized Exception Handlers
setup_exception_handlers(app)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "success": True,
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "operational",
        "docs_url": "/docs",
        "features": [
            "Short-lived Access (15m) + Rotated Refresh Tokens (7d)",
            "PostGIS Geospatial ST_Buffer Territory Engine",
            "Acute:Chronic Workload Ratio (ACWR) Injury Prevention",
            "AI ZoneCoach Daily Briefing & Conversational Intelligence",
            "Strava OAuth2 Sync & Polyline Stream Ingestion",
            "Role-Based Access Control (RBAC) & IDOR Protection",
        ],
    }


@app.get("/health")
async def health_check():
    return {"success": True, "status": "healthy"}
