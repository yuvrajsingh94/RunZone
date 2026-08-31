import math
from typing import List, Tuple, Dict, Any


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Calculate the great-circle distance between two points on Earth in meters.
    coord format: (latitude, longitude)
    """
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def calculate_total_distance(coordinates: List[List[float]]) -> float:
    """
    Calculate total path length in meters from GeoJSON [[lon, lat], ...] coordinates.
    """
    if len(coordinates) < 2:
        return 0.0
    
    total = 0.0
    for i in range(len(coordinates) - 1):
        p1 = (coordinates[i][1], coordinates[i][0])      # (lat, lon)
        p2 = (coordinates[i+1][1], coordinates[i+1][0])  # (lat, lon)
        total += haversine_distance(p1, p2)
    return total


def generate_simulated_run_track(start_lat: float, start_lon: float, distance_km: float = 5.0) -> List[List[float]]:
    """
    Generate a realistic running polygon loop / path around a starting center coordinate.
    Returns GeoJSON [[lon, lat], ...] coordinates.
    """
    num_points = 24
    radius_deg = (distance_km / 6.28) / 111.0  # approximate circle radius in degrees
    
    coords: List[List[float]] = []
    for i in range(num_points):
        angle = (2 * math.pi / (num_points - 1)) * i
        # Add slight pseudo-random variation to simulate real roads/turns
        jitter = 0.85 + 0.3 * math.sin(i * 1.5)
        lat = start_lat + (radius_deg * math.sin(angle) * jitter)
        lon = start_lon + (radius_deg * math.cos(angle) * jitter) / math.cos(math.radians(start_lat))
        coords.append([round(lon, 6), round(lat, 6)])
    
    # Close the loop
    coords.append(coords[0])
    return coords
