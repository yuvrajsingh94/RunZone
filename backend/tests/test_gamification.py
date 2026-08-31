import pytest
from app.services.gamification_service import GamificationService


def test_calculate_xp_and_level_zero():
    xp, level = GamificationService.calculate_xp_and_level(
        total_distance_km=0.0,
        total_territory_km2=0.0,
        activities_count=0,
    )
    assert xp == 0
    assert level == 1


def test_calculate_xp_and_level_intermediate():
    # 50 km distance (= 5,000 XP) + 2 km² territory (= 1,000 XP) + 10 activities (= 500 XP)
    # Total XP = 6,500 XP -> Level = 1 + (6500 // 1000) = 7
    xp, level = GamificationService.calculate_xp_and_level(
        total_distance_km=50.0,
        total_territory_km2=2.0,
        activities_count=10,
    )
    assert xp == 6500
    assert level == 7


def test_calculate_xp_and_level_veteran():
    # 142.5 km distance (= 14,250 XP) + 4.82 km² territory (= 2,410 XP) + 20 activities (= 1,000 XP)
    # Total XP = 17,660 XP -> Level = 1 + (17660 // 1000) = 18
    xp, level = GamificationService.calculate_xp_and_level(
        total_distance_km=142.5,
        total_territory_km2=4.82,
        activities_count=20,
    )
    assert xp == 17660
    assert level == 18
