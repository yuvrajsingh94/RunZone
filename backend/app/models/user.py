from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum
import enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    RUNNER = "runner"
    COACH = "coach"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True)
    
    # Role & Access Control
    role = Column(String(50), default=UserRole.RUNNER.value, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(255), nullable=True, index=True)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)  # Soft deletion
    
    # Athlete Profile
    avatar_url = Column(String(500), nullable=True)
    resting_hr = Column(Integer, default=60)
    max_hr = Column(Integer, default=190)
    weight_kg = Column(Float, default=70.0)
    health_conditions = Column(String(500), default="", nullable=True) # Comma-separated or JSON string
    
    # Gamification Stats
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    total_distance_km = Column(Float, default=0.0)
    total_territory_km2 = Column(Float, default=0.0)
    faction_color = Column(String(20), default="#3B82F6")  # Blue, Red, Neon Green, Purple

    # Strava Integration
    strava_athlete_id = Column(String(100), unique=True, nullable=True, index=True)
    strava_access_token = Column(String(255), nullable=True)
    strava_refresh_token = Column(String(255), nullable=True)
    strava_token_expires_at = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    territories = relationship("TerritoryZone", back_populates="owner", cascade="all, delete-orphan")
    daily_metrics = relationship("DailyMetric", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    password_resets = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
