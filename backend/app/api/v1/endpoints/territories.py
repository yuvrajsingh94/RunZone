from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.websockets import ws_manager
from app.models.user import User
from app.models.territory import TerritoryZone, TerritoryCaptureLog
from app.schemas.territory import TerritoryClaimRequest, TerritoryResponse, GeoJSONFeatureCollection
from app.schemas.common import APIResponse
from app.services.spatial_service import SpatialService

router = APIRouter(prefix="/territories", tags=["PostGIS Territories"])


@router.websocket("/ws")
async def territory_websocket_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket feed for live territory conquests, zone decay, and rival battles.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and handle incoming heartbeat / ping messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@router.get("/map", response_model=APIResponse[GeoJSONFeatureCollection])
async def get_territory_map(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns GeoJSON FeatureCollection of all active territory polygons for Mapbox / Leaflet map rendering.
    """
    query = select(TerritoryZone).options(selectinload(TerritoryZone.owner)).order_by(TerritoryZone.captured_at.desc())
    result = await db.execute(query)
    zones = result.scalars().all()

    features = []
    for zone in zones:
        if not zone.geojson_data:
            continue
        
        owner = zone.owner
        features.append({
            "type": "Feature",
            "id": zone.id,
            "geometry": zone.geojson_data,
            "properties": {
                "id": zone.id,
                "zone_name": zone.zone_name,
                "area_km2": zone.area_km2,
                "defense_points": zone.defense_points,
                "owner_id": zone.owner_id,
                "owner_username": owner.username if owner else "Unknown",
                "owner_color": owner.faction_color if owner else "#3B82F6",
                "is_user_owned": zone.owner_id == current_user.id,
                "captured_at": zone.captured_at.isoformat() if zone.captured_at else None,
            }
        })

    return APIResponse(
        success=True,
        message="Territory map feature collection loaded",
        data=GeoJSONFeatureCollection(type="FeatureCollection", features=features),
    )


@router.post("/claim", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def claim_territory(
    payload: TerritoryClaimRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    PostGIS Corridor Territory Claiming with Real-Time WebSocket Broadcasting.
    """
    if len(payload.coordinates) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least 2 coordinate points required for territory claim",
        )

    result = await SpatialService.claim_territory(
        db=db,
        user_id=current_user.id,
        coordinates=payload.coordinates,
        buffer_meters=payload.buffer_meters,
        activity_id=payload.activity_id,
        zone_name=payload.zone_name,
    )

    # Broadcast live conquest event to all connected runners
    await ws_manager.broadcast({
        "event": "territory_claimed",
        "zone_name": result.get("zone_name"),
        "area_km2": result.get("area_km2"),
        "owner_username": current_user.username,
        "owner_color": current_user.faction_color,
        "coordinates": payload.coordinates,
    })

    return APIResponse(
        success=True,
        message=f"Territory claimed! Captured {result['area_km2']:.3f} km².",
        data=result,
    )


@router.post("/decay/trigger", response_model=APIResponse[List[dict]])
async def trigger_territory_decay_sweep(
    db: AsyncSession = Depends(get_db),
):
    """
    Executes a territory decay sweep:
    Sectors unrun for >7 days lose 15 defense points per day.
    Sectors hitting 0 defense points become neutral/unclaimed.
    """
    from app.services.territory_decay_service import TerritoryDecayService
    events = await TerritoryDecayService.process_all_territories_decay(db=db)
    return APIResponse(
        success=True,
        message=f"Decay sweep completed. {len(events)} sectors updated.",
        data=events,
    )

