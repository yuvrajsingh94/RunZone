import pytest
from app.services.biometrics_service import BiometricsService


def test_compute_readiness_score_empty():
    score, category = BiometricsService.compute_readiness_score(
        hrv_rmssd=None,
        resting_hr=None,
        sleep_hours=None,
    )
    assert score is None
    assert category is None


def test_compute_readiness_score_primed():
    # Elevated HRV (80ms > 64ms baseline), low resting HR (46bpm < 52 baseline), 8.5h good sleep
    score, category = BiometricsService.compute_readiness_score(
        hrv_rmssd=80.0,
        hrv_baseline=64.0,
        resting_hr=46,
        rhr_baseline=52,
        sleep_hours=8.5,
        sleep_quality=92,
    )
    assert score is not None
    assert score >= 80
    assert category == "Primed for High Load"


def test_compute_readiness_score_optimal():
    # Normal baseline readings
    score, category = BiometricsService.compute_readiness_score(
        hrv_rmssd=64.0,
        hrv_baseline=64.0,
        resting_hr=52,
        rhr_baseline=52,
        sleep_hours=7.5,
        sleep_quality=80,
    )
    assert score is not None
    assert 60 <= score < 80
    assert category == "Optimal Aerobic Base"


def test_compute_readiness_score_strain():
    # Depressed HRV (42ms), elevated resting pulse (62bpm), low sleep (4.5h)
    score, category = BiometricsService.compute_readiness_score(
        hrv_rmssd=42.0,
        hrv_baseline=64.0,
        resting_hr=62,
        rhr_baseline=52,
        sleep_hours=4.5,
        sleep_quality=55,
    )
    assert score is not None
    assert score < 60
    assert "Strain" in category
