from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user_id
from app.services.strava_service import StravaService

router = APIRouter(prefix="/strava", tags=["Strava OAuth & Webhooks"])


@router.get("/connect")
async def get_strava_connect_url(user_id: int = Depends(get_current_user_id)):
    """Returns the authorization URL for the user to link their Strava account."""
    url = StravaService.get_authorization_url(state=f"user_{user_id}")
    return {"authorization_url": url}


@router.get("/callback")
async def strava_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handles OAuth2 redirect from Strava."""
    try:
        user_id = int(state.replace("user_", ""))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid OAuth state parameter")

    try:
        await StravaService.exchange_token(db=db, user_id=user_id, code=code)
        # Auto-sync recent activities after connection
        await StravaService.sync_athlete_activities(db=db, user_id=user_id, count=5)
        return RedirectResponse(url="http://localhost:5173/profile?strava_connected=true")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sync")
async def sync_strava_activities(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    count: int = 10,
):
    """Triggers manual Strava activity sync for the current athlete."""
    synced = await StravaService.sync_athlete_activities(db=db, user_id=user_id, count=count)
    return {"synced_count": len(synced), "activities": synced}


@router.get("/webhook")
async def verify_strava_webhook_subscription(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    """
    Strava Webhook Subscription Challenge Verification Endpoint.
    Validates hub.verify_token and returns hub.challenge to establish push event subscription.
    """
    if hub_verify_token != settings.STRAVA_VERIFY_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid hub.verify_token",
        )
    return {"hub.challenge": hub_challenge}


async def _process_webhook_background(event_data: Dict[str, Any]):
    """Background task to fetch and ingest Strava activity without blocking request cycle."""
    async with AsyncSessionLocal() as db:
        try:
            await StravaService.process_webhook_event(db=db, event_data=event_data)
        except Exception as e:
            print(f"[Strava Webhook Error] Failed to process event: {e}")


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def receive_strava_webhook_event(
    event_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
):
    """
    Strava Push Webhook Event Receiver:
    Receives activity creation/update events from Strava, acknowledges immediately within 2s,
    and enqueues background processing (GPS stream -> PostGIS 40m corridor -> territory conquest).
    """
    background_tasks.add_task(_process_webhook_background, event_data)
    return {"status": "ok"}
