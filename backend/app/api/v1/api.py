from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    activities,
    territories,
    analytics,
    coach,
    leaderboard,
    strava,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(activities.router)
api_router.include_router(territories.router)
api_router.include_router(analytics.router)
api_router.include_router(coach.router)
api_router.include_router(leaderboard.router)
api_router.include_router(strava.router)
