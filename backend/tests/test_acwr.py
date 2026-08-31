import pytest
from app.services.acwr_service import ACWRService


def test_classify_injury_risk_under_training():
    risk_cat, pct, badge = ACWRService.classify_injury_risk(0.65)
    assert risk_cat == "Under-training"
    assert pct == 25


def test_classify_injury_risk_optimal_sweet_spot():
    risk_cat, pct, badge = ACWRService.classify_injury_risk(1.15)
    assert "Optimal" in risk_cat
    assert pct <= 15


def test_classify_injury_risk_overreaching():
    risk_cat, pct, badge = ACWRService.classify_injury_risk(1.42)
    assert "High Alert" in risk_cat
    assert pct == 55


def test_classify_injury_risk_danger_zone():
    risk_cat, pct, badge = ACWRService.classify_injury_risk(1.78)
    assert "Danger Zone" in risk_cat
    assert pct >= 80


def test_calculate_activity_workload_rpe():
    # 30 min run at RPE 6 = 180 workload units
    workload = ACWRService.calculate_activity_workload(duration_seconds=1800, rpe_score=6)
    assert workload == 180.0


def test_calculate_activity_workload_heart_rate():
    # 45 min run with HR
    workload = ACWRService.calculate_activity_workload(
        duration_seconds=2700,
        rpe_score=7,
        avg_heart_rate=160,
        resting_hr=50,
        max_hr=190
    )
    assert workload > 0
