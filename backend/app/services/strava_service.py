import httpx
import polyline
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User
from app.models.activity import Activity
from app.services.spatial_service import SpatialService
from app.services.acwr_service import ACWRService
from app.core.websockets import ws_manager


class StravaService:
    STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
    STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
    STRAVA_API_BASE = "https://www.strava.com/api/v3"

    @classmethod
    def get_authorization_url(cls, state: str = "runzone_auth") -> str:
        """Construct Strava OAuth2 connect authorization URL."""
        return (
            f"{cls.STRAVA_AUTH_URL}?"
            f"client_id={settings.STRAVA_CLIENT_ID}&"
            f"response_type=code&"
            f"redirect_uri={settings.STRAVA_REDIRECT_URI}&"
            f"approval_prompt=auto&"
            f"scope=read,activity:read_all&"
            f"state={state}"
        )

    @classmethod
    async def exchange_token(cls, db: AsyncSession, user_id: int, code: str) -> Dict[str, Any]:
        """Exchange authorization code for Strava access & refresh tokens."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                cls.STRAVA_TOKEN_URL,
                data={
                    "client_id": settings.STRAVA_CLIENT_ID,
                    "client_secret": settings.STRAVA_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            if resp.status_code != 200:
                raise Exception(f"Failed to exchange Strava token: {resp.text}")
            
            data = resp.json()
            athlete = data.get("athlete", {})
            
            # Update user with Strava credentials
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if user:
                user.strava_athlete_id = str(athlete.get("id"))
                user.strava_access_token = data.get("access_token")
                user.strava_refresh_token = data.get("refresh_token")
                user.strava_token_expires_at = data.get("expires_at")
                user.is_strava_connected = True
                await db.commit()

            return data

    @classmethod
    async def ensure_valid_token(cls, db: AsyncSession, user: User) -> Optional[str]:
        """Ensures the user has an active, non-expired Strava access token."""
        if not user or not user.strava_access_token:
            return None

        # If expired, refresh
        if user.strava_token_expires_at and user.strava_token_expires_at < datetime.now(timezone.utc).timestamp():
            async with httpx.AsyncClient() as client:
                refresh_resp = await client.post(
                    cls.STRAVA_TOKEN_URL,
                    data={
                        "client_id": settings.STRAVA_CLIENT_ID,
                        "client_secret": settings.STRAVA_CLIENT_SECRET,
                        "grant_type": "refresh_token",
                        "refresh_token": user.strava_refresh_token,
                    },
                )
                if refresh_resp.status_code == 200:
                    rdata = refresh_resp.json()
                    user.strava_access_token = rdata.get("access_token")
                    user.strava_refresh_token = rdata.get("refresh_token")
                    user.strava_token_expires_at = rdata.get("expires_at")
                    await db.commit()

        return user.strava_access_token

    @classmethod
    async def process_webhook_event(
        cls,
        db: AsyncSession,
        event_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Asynchronously processes Strava webhook push event.
        Fetches activity, decodes GPS coordinates, buffers 40m corridor, and broadcasts via WebSockets.
        """
        object_type = event_data.get("object_type")
        aspect_type = event_data.get("aspect_type")
        object_id = str(event_data.get("object_id"))
        owner_id = str(event_data.get("owner_id"))

        if object_type != "activity" or aspect_type not in ["create", "update"]:
            return None

        # Match user by Strava athlete ID
        user_res = await db.execute(select(User).where(User.strava_athlete_id == owner_id))
        user = user_res.scalar_one_or_none()
        if not user:
            return None

        token = await cls.ensure_valid_token(db, user)
        if not token:
            return None

        # Fetch full activity details from Strava API
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{cls.STRAVA_API_BASE}/activities/{object_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                return None
            act_data = resp.json()

        if act_data.get("type") not in ["Run", "TrailRun", "VirtualRun"]:
            return None

        # Check for duplicate
        existing = await db.execute(select(Activity).where(Activity.external_id == object_id))
        if existing.scalar_one_or_none():
            return None

        summary_poly = act_data.get("map", {}).get("summary_polyline")
        geojson_coords: List[List[float]] = []
        if summary_poly:
            try:
                lat_lon_points = polyline.decode(summary_poly)
                geojson_coords = [[round(p[1], 6), round(p[0], 6)] for p in lat_lon_points]
            except Exception:
                geojson_coords = []

        dist_m = float(act_data.get("distance", 0.0))
        dur_s = int(act_data.get("moving_time", 0))
        avg_hr = act_data.get("average_heartrate")
        rpe = 6

        workload = ACWRService.calculate_activity_workload(
            duration_seconds=dur_s,
            rpe_score=rpe,
            avg_heart_rate=int(avg_hr) if avg_hr else None,
            resting_hr=user.resting_hr,
            max_hr=user.max_hr,
        )

        started_str = act_data.get("start_date")
        started_at = (
            datetime.fromisoformat(started_str.replace("Z", "+00:00"))
            if started_str
            else datetime.now(timezone.utc)
        )

        new_act = Activity(
            user_id=user.id,
            title=act_data.get("name", "Strava Run"),
            activity_type="Run",
            distance_meters=dist_m,
            duration_seconds=dur_s,
            elevation_gain_meters=float(act_data.get("total_elevation_gain", 0.0)),
            avg_speed_mps=float(act_data.get("average_speed", 0.0)),
            avg_heart_rate=int(avg_hr) if avg_hr else None,
            max_heart_rate=int(act_data.get("max_heartrate")) if act_data.get("max_heartrate") else None,
            workload_score=workload,
            rpe_score=rpe,
            summary_polyline=summary_poly,
            geojson_data={"type": "LineString", "coordinates": geojson_coords} if geojson_coords else None,
            source="strava_webhook",
            external_id=object_id,
            started_at=started_at,
        )
        db.add(new_act)
        await db.flush()

        territory_captured = 0.0
        if len(geojson_coords) >= 2:
            territory_result = await SpatialService.claim_territory(
                db=db,
                user_id=user.id,
                coordinates=geojson_coords,
                buffer_meters=40.0,
                activity_id=new_act.id,
                zone_name=f"{new_act.title} Territory",
            )
            territory_captured = territory_result.get("area_km2", 0.0)
            new_act.territory_captured_km2 = territory_captured

            # Broadcast live territory conquest via WebSocket
            try:
                await ws_manager.broadcast({
                    "event": "territory_claimed",
                    "zone_name": territory_result.get("zone_name"),
                    "area_km2": territory_captured,
                    "owner_username": user.username,
                    "owner_color": user.faction_color,
                    "coordinates": geojson_coords,
                })
            except Exception:
                pass

        user.total_distance_km = round((user.total_distance_km or 0.0) + (dist_m / 1000.0), 2)
        await db.commit()

        return {
            "activity_id": new_act.id,
            "title": new_act.title,
            "distance_km": dist_m / 1000.0,
            "territory_captured_km2": territory_captured,
        }

    @classmethod
    async def sync_athlete_activities(cls, db: AsyncSession, user_id: int, count: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch recent running activities from Strava, decode polylines, 
        calculate ACWR workload, and buffer territory zones.
        """
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            return []

        token = await cls.ensure_valid_token(db, user)
        if not token:
            return []

        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{cls.STRAVA_API_BASE}/athlete/activities?per_page={count}",
                headers=headers,
            )
            if resp.status_code != 200:
                return []
            
            strava_activities = resp.json()
            synced: List[Dict[str, Any]] = []

            for act in strava_activities:
                if act.get("type") not in ["Run", "TrailRun", "VirtualRun"]:
                    continue

                ext_id = str(act.get("id"))
                existing = await db.execute(select(Activity).where(Activity.external_id == ext_id))
                if existing.scalar_one_or_none():
                    continue

                summary_poly = act.get("map", {}).get("summary_polyline")
                geojson_coords = []
                if summary_poly:
                    try:
                        lat_lon_points = polyline.decode(summary_poly)
                        geojson_coords = [[round(p[1], 6), round(p[0], 6)] for p in lat_lon_points]
                    except Exception:
                        geojson_coords = []

                dist_m = float(act.get("distance", 0.0))
                dur_s = int(act.get("moving_time", 0))
                avg_hr = act.get("average_heartrate")
                rpe = 6

                workload = ACWRService.calculate_activity_workload(
                    duration_seconds=dur_s,
                    rpe_score=rpe,
                    avg_heart_rate=int(avg_hr) if avg_hr else None,
                    resting_hr=user.resting_hr,
                    max_hr=user.max_hr,
                )

                started_str = act.get("start_date")
                started_at = datetime.fromisoformat(started_str.replace("Z", "+00:00")) if started_str else datetime.now(timezone.utc)

                new_act = Activity(
                    user_id=user.id,
                    title=act.get("name", "Strava Run"),
                    activity_type="Run",
                    distance_meters=dist_m,
                    duration_seconds=dur_s,
                    elevation_gain_meters=float(act.get("total_elevation_gain", 0.0)),
                    avg_speed_mps=float(act.get("average_speed", 0.0)),
                    avg_heart_rate=int(avg_hr) if avg_hr else None,
                    max_heart_rate=int(act.get("max_heartrate")) if act.get("max_heartrate") else None,
                    workload_score=workload,
                    rpe_score=rpe,
                    summary_polyline=summary_poly,
                    geojson_data={"type": "LineString", "coordinates": geojson_coords} if geojson_coords else None,
                    source="strava",
                    external_id=ext_id,
                    started_at=started_at,
                )
                db.add(new_act)
                await db.flush()

                if len(geojson_coords) >= 2:
                    territory_result = await SpatialService.claim_territory(
                        db=db,
                        user_id=user.id,
                        coordinates=geojson_coords,
                        buffer_meters=40.0,
                        activity_id=new_act.id,
                        zone_name=f"{act.get('name', 'Run')} Territory",
                    )
                    new_act.territory_captured_km2 = territory_result["area_km2"]

                user.total_distance_km = round((user.total_distance_km or 0.0) + (dist_m / 1000.0), 2)
                synced.append({"id": new_act.id, "title": new_act.title, "distance_km": dist_m / 1000.0})

            await db.commit()
            return synced
