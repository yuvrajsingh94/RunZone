from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class ACWRMetricPoint(BaseModel):
    date: date
    acute_load: float
    chronic_load: float
    acwr_ratio: float
    distance_km: float
    risk_category: str


class ACWRDashboardSummary(BaseModel):
    current_acwr: float
    current_risk_category: str  # Optimal, Under-training, High Alert, Danger
    acute_workload_7d: float
    chronic_workload_28d: float
    total_distance_7d_km: float
    total_distance_28d_km: float
    injury_risk_percentage: int
    recommendation_badge: str
    weekly_history: List[ACWRMetricPoint]


class BiometricEntryCreate(BaseModel):
    metric_date: Optional[date] = None
    hrv_rmssd: float = Field(..., ge=10.0, le=250.0, description="Heart Rate Variability rMSSD in ms")
    resting_hr: int = Field(..., ge=30, le=140, description="Resting heart rate in bpm")
    sleep_hours: float = Field(..., ge=0.0, le=24.0, description="Sleep duration in hours")
    sleep_quality: Optional[int] = Field(85, ge=0, le=100, description="Sleep quality rating percentage")


class BiometricDayResponse(BaseModel):
    date: str
    day_name: str
    hrv_rmssd: Optional[float] = None
    hrv_baseline: float = 64.0
    resting_hr: Optional[int] = None
    rhr_baseline: int = 52
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    readiness_score: Optional[int] = None
    readiness_category: Optional[str] = None
    glycogen_restored: Optional[int] = None


class BiometricsDashboardResponse(BaseModel):
    has_data: bool
    current_readiness_score: Optional[int] = None
    current_readiness_category: Optional[str] = None
    current_hrv_rmssd: Optional[float] = None
    current_resting_hr: Optional[int] = None
    current_sleep_hours: Optional[float] = None
    current_sleep_quality: Optional[int] = None
    history: List[BiometricDayResponse] = []


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    faction_color: str
    total_territory_km2: float
    total_distance_km: float
    level: int
    xp: Optional[int] = 0
