from typing import List, Optional
from pydantic import BaseModel


class CoachChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class CoachChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[CoachChatMessage]] = []


class DailyCoachBriefing(BaseModel):
    title: str
    greeting: str
    injury_risk_assessment: str
    acwr_status_summary: str
    recommended_workout: str
    suggested_target_zone: str  # e.g. "Zone 2 Low Aerobic", "Rest & Mobility"
    motivational_quote: str


class WorkoutDay(BaseModel):
    day_name: str  # "Monday", "Tuesday", etc.
    title: str
    workout_type: str  # "Aerobic Base", "Active Recovery", "Tempo", "Long Run", "Rest"
    distance_km: float
    target_zone: str
    target_pace: str
    description: str
    is_rest_day: bool = False


class TrainingWeek(BaseModel):
    week_number: int
    theme: str
    total_distance_km: float
    target_acwr: float
    workouts: List[WorkoutDay]


class AdaptiveTrainingPlan(BaseModel):
    plan_name: str
    target_distance: str
    duration_weeks: int
    current_acwr: float
    medical_constraint_notes: Optional[str] = None
    weeks: List[TrainingWeek]


class WorkoutPlanGeneratorRequest(BaseModel):
    target_race_distance: str = "10K"  # 5K, 10K, Half Marathon, Marathon, Territory Expansion
    days_per_week: int = 4
    duration_weeks: int = 4  # 4, 8, 12 weeks
    fitness_level: str = "Intermediate"  # Beginner, Intermediate, Advanced
