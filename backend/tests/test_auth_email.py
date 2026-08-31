import pytest
from app.core.config import settings
from app.services.email_service import EmailService


def test_email_service_dev_mode():
    # In dev mode, send_email should succeed and log cleanly to stdout
    success = EmailService.send_email(
        to_email="testrunner@runzone.ai",
        subject="Test RunZone Email",
        html_body="<p>Test</p>",
        text_body="Test",
    )
    assert success is True


def test_verification_email_builder():
    success = EmailService.send_verification_email(
        to_email="newrunner@runzone.ai",
        username="NewRunner",
        token="test_verification_token_12345",
    )
    assert success is True


def test_password_reset_email_builder():
    success = EmailService.send_password_reset_email(
        to_email="runner@runzone.ai",
        username="AlexRunner",
        token="test_reset_token_67890",
    )
    assert success is True
