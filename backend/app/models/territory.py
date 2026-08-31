from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base


class TerritoryZone(Base):
    __tablename__ = "territory_zones"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    
    zone_name = Column(String(150), default="Sector Alpha")
    area_km2 = Column(Float, nullable=False, default=0.0)
    defense_points = Column(Integer, default=100)
    
    # PostGIS Polygon/MultiPolygon Geometry with GiST index
    geom = Column(Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=True)
    geojson_data = Column(JSON, nullable=True)  # GeoJSON representation for fast API responses

    captured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Territory decay mechanism
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="territories")
    capture_logs = relationship("TerritoryCaptureLog", back_populates="zone", cascade="all, delete-orphan")


class TerritoryCaptureLog(Base):
    __tablename__ = "territory_capture_logs"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("territory_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    new_owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="SET NULL"), nullable=True)
    
    stolen_area_km2 = Column(Float, default=0.0)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    zone = relationship("TerritoryZone", back_populates="capture_logs")
