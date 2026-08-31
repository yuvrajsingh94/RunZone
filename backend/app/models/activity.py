from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Morning Run")
    activity_type = Column(String(50), default="Run")  # Run, Trail Run, Interval, Recovery
    
    # Distance, Time & Metrics
    distance_meters = Column(Float, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    elevation_gain_meters = Column(Float, default=0.0)
    avg_speed_mps = Column(Float, default=0.0)
    avg_heart_rate = Column(Integer, nullable=True)
    max_heart_rate = Column(Integer, nullable=True)
    calories = Column(Integer, nullable=True)
    
    # Workload Calculation (TRIMP / RPE / Distance load)
    workload_score = Column(Float, default=0.0)
    rpe_score = Column(Integer, default=5)  # Rate of Perceived Exertion (1-10)

    # Geospatial Track Data
    # 4326 is standard GPS WGS84 coordinates
    route_geom = Column(Geometry(geometry_type="LINESTRING", srid=4326, spatial_index=True), nullable=True)
    summary_polyline = Column(Text, nullable=True)
    geojson_data = Column(JSON, nullable=True)  # Stored GeoJSON LineString coordinates [[lon, lat], ...]

    # Territory Capture Results
    territory_captured_km2 = Column(Float, default=0.0)

    # Source info
    source = Column(String(50), default="manual")  # manual, gpx_upload, strava
    external_id = Column(String(100), nullable=True, index=True)

    started_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="activities")
