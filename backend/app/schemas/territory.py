from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel


class TerritoryClaimRequest(BaseModel):
    activity_id: Optional[int] = None
    coordinates: List[List[float]]  # [[lon, lat], ...]
    buffer_meters: float = 40.0
    zone_name: Optional[str] = None


class TerritoryResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: Optional[str] = None
    owner_color: Optional[str] = None
    zone_name: str
    area_km2: float
    defense_points: int
    geojson_geometry: Dict[str, Any]
    captured_at: datetime
    is_user_owned: bool = False

    class Config:
        from_attributes = True


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
