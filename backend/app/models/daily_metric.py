from datetime import date, datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_date = Column(Date, nullable=False, index=True)
    
    # Raw daily volume
    total_distance_meters = Column(Float, default=0.0)
    total_duration_seconds = Column(Integer, default=0)
    daily_workload_load = Column(Float, default=0.0)  # TRIMP or Distance-Intensity load
    
    # ACWR Rolling calculations
    acute_load_7d = Column(Float, default=0.0)      # 7-day average/rolling workload
    chronic_load_28d = Column(Float, default=0.0)   # 28-day average/rolling workload
    acwr_ratio = Column(Float, default=1.0)         # acute / chronic
    risk_category = Column(String(50), default="Optimal")  # Optimal, Under-training, High Alert, Danger
    
    # Biometric Telemetry (HRV, Resting HR, Sleep & Readiness)
    hrv_rmssd = Column(Float, nullable=True)        # Root mean square of successive RR intervals (ms)
    resting_hr = Column(Integer, nullable=True)      # Morning resting heart rate (bpm)
    sleep_hours = Column(Float, nullable=True)      # Sleep duration (hours)
    sleep_quality = Column(Integer, nullable=True)  # Sleep quality rating (0-100%)
    readiness_score = Column(Integer, nullable=True) # Computed holistic autonomic readiness (1-100%)
    readiness_category = Column(String(50), nullable=True) # "Primed", "Optimal", "Rest Mandated"

    # AI Coaching Feedback
    coach_feedback_summary = Column(Text, nullable=True)
    recommended_action = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="daily_metrics")
