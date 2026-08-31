from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from app.core.database import Base


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, default="Season 1: Pacific Reconnaissance")
    description = Column(Text, nullable=True)
    reward_xp = Column(Integer, default=5000)
    is_active = Column(Boolean, default=True)

    start_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    end_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
