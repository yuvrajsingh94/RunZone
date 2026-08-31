import pytest
from app.utils.geo_helpers import haversine_distance, calculate_total_distance, generate_simulated_run_track
from app.services.spatial_service import SpatialService


def test_haversine_distance():
    # San Francisco Ferry Building to Transamerica Pyramid (~1.2 km)
    p1 = (37.7955, -122.3937)
    p2 = (37.7952, -122.4028)
    dist = haversine_distance(p1, p2)
    assert 700 < dist < 900


def test_generate_simulated_run_track():
    coords = generate_simulated_run_track(37.7749, -122.4194, distance_km=5.0)
    assert len(coords) >= 10
    # First point should equal last point (closed loop)
    assert coords[0] == coords[-1]
    
    total_dist = calculate_total_distance(coords)
    assert total_dist > 3000  # meters


def test_buffer_linestring_meters():
    coords = [
        [-122.4194, 37.7749],
        [-122.4184, 37.7759],
        [-122.4174, 37.7769],
    ]
    poly_geojson = SpatialService.buffer_linestring_meters(coords, buffer_meters=40.0)
    assert poly_geojson["type"] == "Polygon"
    assert len(poly_geojson["coordinates"][0]) > 4
    
    area = SpatialService.calculate_polygon_area_km2(poly_geojson)
    assert area > 0
