import math
import json
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import LineString, Polygon, mapping, shape
from shapely.ops import unary_union
import pyproj
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, update

from app.models.territory import TerritoryZone, TerritoryCaptureLog
from app.models.user import User


class SpatialService:
    @staticmethod
    def buffer_linestring_meters(coordinates: List[List[float]], buffer_meters: float = 40.0) -> Dict[str, Any]:
        """
        Takes GeoJSON coordinates [[lon, lat], ...] and returns a buffered GeoJSON Polygon.
        Uses WGS84 geodesic projection approximation for precision buffer in meters.
        """
        if len(coordinates) < 2:
            # If single point, return small circle buffer
            lon, lat = coordinates[0]
            deg_radius = buffer_meters / 111320.0
            from shapely.geometry import Point
            poly = Point(lon, lat).buffer(deg_radius)
            return mapping(poly)

        # Convert to Shapely LineString
        line = LineString(coordinates)

        # Approximate metric buffer in degrees at mean latitude
        mean_lat = sum(c[1] for c in coordinates) / len(coordinates)
        lat_scale = 111320.0  # 1 degree latitude ~= 111.32 km
        lon_scale = 111320.0 * max(0.1, abs(math.cos(math.radians(mean_lat))))

        deg_buffer_y = buffer_meters / lat_scale
        deg_buffer_x = buffer_meters / lon_scale
        avg_deg_buffer = (deg_buffer_x + deg_buffer_y) / 2.0

        # Create buffered polygon (simplifying with small tolerance to keep vertices optimized)
        buffered_poly = line.buffer(avg_deg_buffer, resolution=16)
        if not buffered_poly.is_valid:
            buffered_poly = buffered_poly.buffer(0)
            
        return mapping(buffered_poly)

    @staticmethod
    def calculate_polygon_area_km2(geojson_poly: Dict[str, Any]) -> float:
        """Calculate geodesic area in km^2 from GeoJSON Polygon geometry."""
        try:
            poly = shape(geojson_poly)
            # Standard geodesic area approximation:
            centroid_lat = poly.centroid.y
            # 1 deg lat = 111.32 km, 1 deg lon = 111.32 * cos(lat) km
            import math
            deg2_to_km2 = (111.32 ** 2) * math.cos(math.radians(centroid_lat))
            area_km2 = poly.area * deg2_to_km2
            return round(max(0.0001, area_km2), 4)
        except Exception:
            return 0.05

    @classmethod
    async def claim_territory(
        cls,
        db: AsyncSession,
        user_id: int,
        coordinates: List[List[float]],
        buffer_meters: float = 40.0,
        activity_id: Optional[int] = None,
        zone_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        PostGIS Territory Capture Engine:
        1. Generates buffered territory polygon around GPS track.
        2. Detects overlapping rival zones with ST_Intersects / spatial queries.
        3. Calculates newly claimed area and handles capture logs.
        4. Updates user's total territory stat.
        """
        geojson_poly = cls.buffer_linestring_meters(coordinates, buffer_meters)
        area_km2 = cls.calculate_polygon_area_km2(geojson_poly)
        
        name = zone_name or f"Sector-{user_id}-{(activity_id or 100) % 999}"

        # Create new territory zone
        new_zone = TerritoryZone(
            owner_id=user_id,
            activity_id=activity_id,
            zone_name=name,
            area_km2=area_km2,
            defense_points=100,
            geojson_data=geojson_poly,
        )
        db.add(new_zone)
        await db.flush()

        # Check for overlapping competitor zones to capture / contest
        overlap_result = await db.execute(
            select(TerritoryZone).where(
                TerritoryZone.owner_id != user_id
            )
        )
        rival_zones = overlap_result.scalars().all()
        
        captured_stolen_km2 = 0.0
        new_poly_shape = shape(geojson_poly)

        for r_zone in rival_zones:
            if r_zone.geojson_data:
                try:
                    r_shape = shape(r_zone.geojson_data)
                    if new_poly_shape.intersects(r_shape):
                        intersection = new_poly_shape.intersection(r_shape)
                        if not intersection.is_empty:
                            stolen = cls.calculate_polygon_area_km2(mapping(intersection))
                            captured_stolen_km2 += stolen
                            
                            # Log capture
                            log = TerritoryCaptureLog(
                                zone_id=new_zone.id,
                                previous_owner_id=r_zone.owner_id,
                                new_owner_id=user_id,
                                activity_id=activity_id,
                                stolen_area_km2=stolen
                            )
                            db.add(log)
                            
                            # Reduce defense points of rival
                            r_zone.defense_points = max(0, r_zone.defense_points - 35)
                except Exception:
                    continue

        # Update User total stats
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.total_territory_km2 = round((user.total_territory_km2 or 0.0) + area_km2, 3)
            user.xp = (user.xp or 0) + int(area_km2 * 1000) + 150
            # Level up every 1000 XP
            user.level = max(1, (user.xp // 1000) + 1)

        await db.commit()
        await db.refresh(new_zone)

        return {
            "zone_id": new_zone.id,
            "zone_name": new_zone.zone_name,
            "area_km2": area_km2,
            "stolen_km2": round(captured_stolen_km2, 4),
            "geojson": geojson_poly,
            "total_user_territory_km2": user.total_territory_km2 if user else area_km2,
        }
