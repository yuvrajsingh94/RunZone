import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text

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

# Configure Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("runzone")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure Database Schema is created
    logger.info("Initializing RunZone PostgreSQL/PostGIS database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Auto-seed initial demo athlete & rival factions for instant map interaction
    async with AsyncSessionLocal() as db:
        user_check = await db.execute(select(func.count(User.id)))
        count = user_check.scalar()
        if count == 0:
            logger.info("Seeding initial demo athletes and tactical territory zones...")
            # Demo Athlete
            demo_athlete = User(
                email="athlete@runzone.ai",
                username="ApexRunner",
                hashed_password=get_password_hash("Password123!"),
                full_name="Alex Mercer",
                role=UserRole.RUNNER.value,
                faction_color="#B8492E",  # Cinder Red
                level=7,
                xp=6450,
                total_distance_km=142.5,
                total_territory_km2=4.82,
                resting_hr=52,
                max_hr=194,
                is_active=True,
                is_verified=True,
            )
            
            # Rival 1 (Contour Emerald)
            rival_1 = User(
                email="valkyrie@runzone.ai",
                username="Valkyrie",
                hashed_password=get_password_hash("Password123!"),
                full_name="Elena Vance",
                role=UserRole.RUNNER.value,
                faction_color="#3E8E7E",  # Contour Emerald
                level=6,
                xp=5200,
                total_distance_km=118.0,
                total_territory_km2=3.91,
                resting_hr=56,
                max_hr=188,
                is_active=True,
                is_verified=True,
            )
            
            # Rival 2 (Nordic Blue)
            rival_2 = User(
                email="phantom@runzone.ai",
                username="PhantomStride",
                hashed_password=get_password_hash("Password123!"),
                full_name="Marcus Thorne",
                role=UserRole.RUNNER.value,
                faction_color="#4B7B9A",  # Nordic Blue
                level=5,
                xp=4100,
                total_distance_km=96.4,
                total_territory_km2=2.74,
                resting_hr=49,
                max_hr=198,
                is_active=True,
                is_verified=True,
            )
            
            # Rival 3 (Amber Vanguard)
            rival_3 = User(
                email="zonecommander@runzone.ai",
                username="ZoneCommander",
                hashed_password=get_password_hash("Password123!"),
                full_name="Commander Drake",
                role=UserRole.RUNNER.value,
                faction_color="#C98A2E",  # Amber Vanguard
                level=8,
                xp=8900,
                total_distance_km=210.0,
                total_territory_km2=6.15,
                resting_hr=47,
                max_hr=190,
                is_active=True,
                is_verified=True,
            )

            db.add_all([demo_athlete, rival_1, rival_2, rival_3])
            await db.flush()

            # Seed 28 days of synthetic activity history for ACWR calculations
            now = datetime.now(timezone.utc)
            activities = []
            for day_offset in range(28, 0, -1):
                # Run every 2-3 days
                if day_offset % 2 == 0 or day_offset % 5 == 0:
                    run_date = now - timedelta(days=day_offset, hours=2)
                    dist_meters = 5000 + (day_offset * 120)
                    duration_secs = int(dist_meters / 3.3)  # ~5:00 min/km pace
                    rpe = 6 if day_offset % 4 != 0 else 8
                    
                    workload = ACWRService.calculate_session_rpe_workload(duration_secs, rpe)
                    coords = generate_simulated_run_track(
                        start_lat=37.7749 + (day_offset * 0.001),
                        start_lon=-122.4194 + (day_offset * 0.001),
                        distance_km=dist_meters / 1000.0,
                        num_points=15,
                    )
                    
                    poly = SpatialService.buffer_linestring_meters(coords, 40.0)
                    territory_area = SpatialService.calculate_polygon_area_km2(poly)

                    act = Activity(
                        user_id=demo_athlete.id,
                        title=f"Tactical Session D-{day_offset}",
                        activity_type="run",
                        source="gps_simulation",
                        distance_meters=dist_meters,
                        duration_seconds=duration_secs,
                        elevation_gain_meters=45,
                        avg_speed_mps=3.3,
                        max_speed_mps=4.5,
                        avg_heart_rate=152,
                        max_heart_rate=174,
                        rpe_score=rpe,
                        workload_score=workload,
                        territory_captured_km2=territory_area,
                        geojson_data={"type": "LineString", "coordinates": coords},
                        started_at=run_date,
                    )
                    activities.append(act)

            db.add_all(activities)
            await db.flush()

            # Seed corresponding territory zones
            for act in activities[-6:]:  # Latest 6 runs hold active sectors
                if act.geojson_data and "coordinates" in act.geojson_data:
                    await SpatialService.claim_territory(
                        db=db,
                        user_id=demo_athlete.id,
                        coordinates=act.geojson_data["coordinates"],
                        buffer_meters=45.0,
                        activity_id=act.id,
                        zone_name=f"Apex Corridor {28 - day_offset}",
                    )

            await db.commit()
            logger.info("Demo athletes, historical activities, and territory zones seeded successfully.")

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
    app.state.scheduler = scheduler
    logger.info("APScheduler background engine running. Daily territory decay scheduled at 03:00 UTC.")

    yield

    # Clean Scheduler Shutdown
    scheduler.shutdown(wait=False)
    logger.info("APScheduler shut down cleanly.")
    await engine.dispose()
    logger.info("Database connection engine disposed.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade Geospatial Running SaaS Platform with PostGIS Territory Capture and ACWR Injury Prevention Engine.",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENABLE_PUBLIC_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_PUBLIC_DOCS else None,
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
            "Sliding-Window Rate Limiting on Auth Endpoints",
            "PostGIS Geospatial ST_Buffer Territory Engine",
            "Acute:Chronic Workload Ratio (ACWR) Injury Prevention",
            "AI ZoneCoach Daily Briefing & Conversational Intelligence",
            "Strava OAuth2 Sync & Polyline Stream Ingestion",
            "Automated Daily 03:00 UTC Territory Decay Sweeps",
            "Role-Based Access Control (RBAC) & IDOR Protection",
        ],
    }


@app.get("/health")
async def health_check():
    """
    Basic uptime health check for load balancer and hosting platform probes.
    """
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health/ready")
async def readiness_check():
    """
    Deep readiness probe verifying database connectivity and background scheduler state.
    """
    db_healthy = False
    scheduler_healthy = False

    # Check Database Connection
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_healthy = True
    except Exception as e:
        logger.error(f"Readiness probe DB check failed: {e}")
        db_healthy = False

    # Check Scheduler State
    try:
        scheduler: AsyncIOScheduler = getattr(app.state, "scheduler", None)
        if scheduler and scheduler.running:
            scheduler_healthy = True
    except Exception as e:
        logger.error(f"Readiness probe scheduler check failed: {e}")
        scheduler_healthy = False

    is_ready = db_healthy and scheduler_healthy
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "success": is_ready,
            "status": "ready" if is_ready else "unhealthy",
            "components": {
                "database": "operational" if db_healthy else "down",
                "apscheduler": "operational" if scheduler_healthy else "down",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
