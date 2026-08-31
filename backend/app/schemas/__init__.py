from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserUpdate, UserResponse
from app.schemas.activity import ActivityCreateManual, ActivitySimulateRun, ActivityResponse
from app.schemas.territory import TerritoryClaimRequest, TerritoryResponse, GeoJSONFeatureCollection
from app.schemas.analytics import ACWRMetricPoint, ACWRDashboardSummary, LeaderboardEntry
from app.schemas.coach import CoachChatMessage, CoachChatRequest, DailyCoachBriefing, WorkoutPlanGeneratorRequest

__all__ = [
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "UserUpdate",
    "UserResponse",
    "ActivityCreateManual",
    "ActivitySimulateRun",
    "ActivityResponse",
    "TerritoryClaimRequest",
    "TerritoryResponse",
    "GeoJSONFeatureCollection",
    "ACWRMetricPoint",
    "ACWRDashboardSummary",
    "LeaderboardEntry",
    "CoachChatMessage",
    "CoachChatRequest",
    "DailyCoachBriefing",
    "WorkoutPlanGeneratorRequest",
]
