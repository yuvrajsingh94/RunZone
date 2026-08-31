import pytest
from unittest.mock import AsyncMock, patch
from app.core.config import settings


def test_strava_webhook_verification_token():
    assert settings.STRAVA_VERIFY_TOKEN == "runzone_strava_webhook_token_2026"


@pytest.mark.asyncio
async def test_strava_webhook_event_filter():
    from app.services.strava_service import StravaService
    
    mock_db = AsyncMock()
    
    # Non-activity event should be skipped
    result = await StravaService.process_webhook_event(
        db=mock_db,
        event_data={
            "object_type": "athlete",
            "aspect_type": "update",
            "object_id": 12345,
            "owner_id": 99999,
        }
    )
    assert result is None
