from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ActivityCreateManual(BaseModel):
    title: str = "Training Run"
    activity_type: str = "Run"
    distance_meters: float = Field(..., gt=0)
    duration_seconds: int = Field(..., gt=0)
    elevation_gain_meters: float = 0.0
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    rpe_score: int = Field(5, ge=1, le=10)
    coordinates: Optional[List[List[float]]] = None  # [[lon, lat], [lon, lat], ...]
    started_at: Optional[datetime] = None


class ActivitySimulateRun(BaseModel):
    title: str = "City Loop Run"
    start_lat: float
    start_lon: float
    distance_km: float = 5.0
    duration_minutes: int = 28
    buffer_meters: float = 40.0
    avg_hr: int = 152
    rpe_score: int = 6


class ActivityResponse(BaseModel):
    id: int
    user_id: int
    title: str
    activity_type: str
    distance_meters: float
    duration_seconds: int
    elevation_gain_meters: float
    avg_speed_mps: float
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    workload_score: float
    rpe_score: int
    territory_captured_km2: float
    geojson_data: Optional[Dict[str, Any]] = None
    source: str
    started_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
