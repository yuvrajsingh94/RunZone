from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.core.security import get_current_user, verify_resource_ownership
from app.models.user import User
from app.models.activity import Activity
from app.schemas.activity import ActivityCreateManual, ActivitySimulateRun, ActivityResponse
from app.schemas.common import APIResponse, PaginationMeta
from app.services.spatial_service import SpatialService
from app.services.acwr_service import ACWRService
from app.utils.geo_helpers import generate_simulated_run_track, calculate_total_distance

router = APIRouter(prefix="/activities", tags=["Activities & Workloads"])


@router.get("/", response_model=APIResponse[List[ActivityResponse]])
async def list_activities(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List Athlete Activities with pagination.
    """
    offset = (page - 1) * limit
    count_query = select(func.count(Activity.id)).where(Activity.user_id == current_user.id)
    total_count = (await db.execute(count_query)).scalar() or 0

    query = (
        select(Activity)
        .where(Activity.user_id == current_user.id)
        .order_by(desc(Activity.started_at))
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    activities = result.scalars().all()

    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

    return APIResponse(
        success=True,
        message="Activities retrieved successfully",
        data=[ActivityResponse.model_validate(a) for a in activities],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total_items=total_count,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
    )


@router.get("/{activity_id}", response_model=APIResponse[ActivityResponse])
async def get_activity_detail(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get Activity Detail (with IDOR Resource Ownership Verification).
    """
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    verify_resource_ownership(activity.user_id, current_user, "activity")

    return APIResponse(
        success=True,
        message="Activity details retrieved",
        data=ActivityResponse.model_validate(activity),
    )


@router.post("/manual", response_model=APIResponse[ActivityResponse], status_code=status.HTTP_201_CREATED)
async def create_manual_activity(
    payload: ActivityCreateManual,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Manual Workout Logging with ACWR Workload computation.
    """
    avg_speed = payload.distance_meters / max(1, payload.duration_seconds)
    workload = ACWRService.calculate_activity_workload(
        duration_seconds=payload.duration_seconds,
        rpe_score=payload.rpe_score,
        avg_heart_rate=payload.avg_heart_rate,
        resting_hr=current_user.resting_hr,
        max_hr=current_user.max_hr,
    )

    started_at = payload.started_at or datetime.now(timezone.utc)

    activity = Activity(
        user_id=current_user.id,
        title=payload.title,
        activity_type=payload.activity_type,
        distance_meters=payload.distance_meters,
        duration_seconds=payload.duration_seconds,
        elevation_gain_meters=payload.elevation_gain_meters,
        avg_speed_mps=round(avg_speed, 2),
        avg_heart_rate=payload.avg_heart_rate,
        max_heart_rate=payload.max_heart_rate,
        workload_score=workload,
        rpe_score=payload.rpe_score,
        geojson_data={"type": "LineString", "coordinates": payload.coordinates} if payload.coordinates else None,
        source="manual",
        started_at=started_at,
    )
    db.add(activity)
    await db.flush()

    # Capture territory if coordinates supplied
    if payload.coordinates and len(payload.coordinates) >= 2:
        territory_res = await SpatialService.claim_territory(
            db=db,
            user_id=current_user.id,
            coordinates=payload.coordinates,
            buffer_meters=40.0,
            activity_id=activity.id,
            zone_name=f"{payload.title} Zone",
        )
        activity.territory_captured_km2 = territory_res["area_km2"]

    current_user.total_distance_km = round((current_user.total_distance_km or 0.0) + (payload.distance_meters / 1000.0), 2)
    await db.commit()
    await db.refresh(activity)

    return APIResponse(
        success=True,
        message="Workout logged and workload calculated",
        data=ActivityResponse.model_validate(activity),
    )


@router.post("/simulate", response_model=APIResponse[ActivityResponse], status_code=status.HTTP_201_CREATED)
async def simulate_gps_run(
    payload: ActivitySimulateRun,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Simulate GPS loop with PostGIS ST_Buffer & GiST territory capture.
    """
    coords = generate_simulated_run_track(payload.start_lat, payload.start_lon, payload.distance_km)
    calculated_m = calculate_total_distance(coords)
    duration_s = payload.duration_minutes * 60

    workload = ACWRService.calculate_activity_workload(
        duration_seconds=duration_s,
        rpe_score=payload.rpe_score,
        avg_heart_rate=payload.avg_hr,
        resting_hr=current_user.resting_hr,
        max_hr=current_user.max_hr,
    )

    activity = Activity(
        user_id=current_user.id,
        title=payload.title,
        activity_type="Run",
        distance_meters=calculated_m,
        duration_seconds=duration_s,
        elevation_gain_meters=round(payload.distance_km * 8.5, 1),
        avg_speed_mps=round(calculated_m / max(1, duration_s), 2),
        avg_heart_rate=payload.avg_hr,
        max_heart_rate=payload.avg_hr + 18,
        workload_score=workload,
        rpe_score=payload.rpe_score,
        geojson_data={"type": "LineString", "coordinates": coords},
        source="simulation",
        started_at=datetime.now(timezone.utc),
    )
    db.add(activity)
    await db.flush()

    territory_res = await SpatialService.claim_territory(
        db=db,
        user_id=current_user.id,
        coordinates=coords,
        buffer_meters=payload.buffer_meters,
        activity_id=activity.id,
        zone_name=f"{payload.title} Sector",
    )
    activity.territory_captured_km2 = territory_res["area_km2"]
    current_user.total_distance_km = round((current_user.total_distance_km or 0.0) + (calculated_m / 1000.0), 2)

    await db.commit()
    await db.refresh(activity)

    return APIResponse(
        success=True,
        message=f"Simulation complete! Claimed {activity.territory_captured_km2:.3f} km² territory.",
        data=ActivityResponse.model_validate(activity),
    )


@router.post("/upload-gpx", response_model=APIResponse[ActivityResponse], status_code=status.HTTP_201_CREATED)
async def upload_gpx(
    file: UploadFile = File(...),
    title: str = Form("GPX Uploaded Run"),
    rpe_score: int = Form(6),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse uploaded GPX track, calculate TRIMP, and buffer PostGIS corridor.
    """
    import gpxpy
    content = await file.read()
    gpx = gpxpy.parse(content.decode("utf-8", errors="ignore"))

    coords: List[List[float]] = []
    total_elevation = 0.0
    start_time = None

    for track in gpx.tracks:
        for segment in track.segments:
            for i, point in enumerate(segment.points):
                if start_time is None and point.time:
                    start_time = point.time
                coords.append([round(point.longitude, 6), round(point.latitude, 6)])
                if i > 0 and point.elevation and segment.points[i - 1].elevation:
                    diff = point.elevation - segment.points[i - 1].elevation
                    if diff > 0:
                        total_elevation += diff

    if len(coords) < 2:
        raise HTTPException(status_code=400, detail="Invalid GPX file: At least 2 GPS trackpoints required")

    dist_m = calculate_total_distance(coords)
    dur_s = int(gpx.get_duration() or 1800)

    workload = ACWRService.calculate_activity_workload(
        duration_seconds=dur_s,
        rpe_score=rpe_score,
        resting_hr=current_user.resting_hr,
        max_hr=current_user.max_hr,
    )

    activity = Activity(
        user_id=current_user.id,
        title=title,
        activity_type="Run",
        distance_meters=round(dist_m, 1),
        duration_seconds=dur_s,
        elevation_gain_meters=round(total_elevation, 1),
        avg_speed_mps=round(dist_m / max(1, dur_s), 2),
        workload_score=workload,
        rpe_score=rpe_score,
        geojson_data={"type": "LineString", "coordinates": coords},
        source="gpx_upload",
        started_at=start_time or datetime.now(timezone.utc),
    )
    db.add(activity)
    await db.flush()

    territory_res = await SpatialService.claim_territory(
        db=db,
        user_id=current_user.id,
        coordinates=coords,
        buffer_meters=40.0,
        activity_id=activity.id,
        zone_name=f"{title} Sector",
    )
    activity.territory_captured_km2 = territory_res["area_km2"]
    current_user.total_distance_km = round((current_user.total_distance_km or 0.0) + (dist_m / 1000.0), 2)

    await db.commit()
    await db.refresh(activity)

    return APIResponse(
        success=True,
        message=f"GPX track successfully ingested. Claimed {activity.territory_captured_km2:.3f} km².",
        data=ActivityResponse.model_validate(activity),
    )


@router.delete("/{activity_id}", response_model=APIResponse[dict])
async def delete_activity(
    activity_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete Activity with IDOR verification.
    """
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    verify_resource_ownership(activity.user_id, current_user, "activity")

    await db.delete(activity)
    await db.commit()

    return APIResponse(
        success=True,
        message="Activity deleted successfully",
        data={"id": activity_id, "deleted": True},
    )
