from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
import pytest
from app.services.territory_decay_service import TerritoryDecayService, run_scheduled_territory_decay


def test_decay_within_grace_period():
    now = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)
    # Run was 5 days ago (< 7 days grace period)
    updated_at = now - timedelta(days=5)

    new_defense, has_decayed = TerritoryDecayService.calculate_decay(
        updated_at=updated_at,
        current_defense=100,
        now=now,
    )
    assert not has_decayed
    assert new_defense == 100


def test_decay_one_day_past_grace_period():
    now = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)
    # Run was 8 days ago (1 day past 7-day grace period)
    # Expected: 100 - (1 * 15) = 85 defense points
    updated_at = now - timedelta(days=8)

    new_defense, has_decayed = TerritoryDecayService.calculate_decay(
        updated_at=updated_at,
        current_defense=100,
        now=now,
    )
    assert has_decayed
    assert new_defense == 85


def test_decay_three_days_past_grace():
    now = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)
    # Run was 10 days ago (3 days past 7-day grace period)
    # Expected: 100 - (3 * 15) = 55 defense points
    updated_at = now - timedelta(days=10)

    new_defense, has_decayed = TerritoryDecayService.calculate_decay(
        updated_at=updated_at,
        current_defense=100,
        now=now,
    )
    assert has_decayed
    assert new_defense == 55


def test_decay_to_zero_and_neutral():
    now = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)
    # Run was 14 days ago (7 days past 7-day grace period)
    # Expected: 100 - (7 * 15) = 0 (clamped at 0)
    updated_at = now - timedelta(days=14)

    new_defense, has_decayed = TerritoryDecayService.calculate_decay(
        updated_at=updated_at,
        current_defense=100,
        now=now,
    )
    assert has_decayed
    assert new_defense == 0


@pytest.mark.asyncio
async def test_scheduled_decay_job_execution():
    """
    Directly tests the scheduled job function to ensure it opens a session,
    calls process_all_territories_decay, and returns events without crashing.
    """
    sample_events = [
        {"event": "territory_decay", "zone_id": 1, "old_defense": 100, "new_defense": 85, "is_neutral": False},
        {"event": "territory_decay", "zone_id": 2, "old_defense": 15, "new_defense": 0, "is_neutral": True},
    ]

    with patch.object(TerritoryDecayService, "process_all_territories_decay", new_callable=AsyncMock) as mock_decay:
        mock_decay.return_value = sample_events
        
        # Test direct execution of the scheduled job
        events = await run_scheduled_territory_decay()
        
        assert len(events) == 2
        assert events[0]["new_defense"] == 85
        assert events[1]["is_neutral"] is True
        mock_decay.assert_called_once()


@pytest.mark.asyncio
async def test_scheduled_decay_job_handles_exception_gracefully():
    """
    Ensures that a database exception in the scheduled job does not bubble up or crash the app.
    """
    with patch.object(TerritoryDecayService, "process_all_territories_decay", side_effect=Exception("Database connection timeout")):
        events = await run_scheduled_territory_decay()
        assert events == []
