import pytest
from app.core.security import verify_password, get_password_hash, hash_token, create_access_token, create_refresh_token
from app.schemas.auth import validate_password_strength


def test_password_hashing():
    raw = "StrongRunner2026!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_password_strength_validation():
    # Valid password
    assert validate_password_strength("ValidPass123!") == "ValidPass123!"

    # Short password
    with pytest.raises(ValueError, match="at least 8 characters"):
        validate_password_strength("Short1!")

    # No uppercase
    with pytest.raises(ValueError, match="uppercase letter"):
        validate_password_strength("nouppercase123!")

    # No number
    with pytest.raises(ValueError, match="at least one number"):
        validate_password_strength("NoNumbersHere!")

    # No special character
    with pytest.raises(ValueError, match="special character"):
        validate_password_strength("NoSpecialChar123")


def test_token_creation():
    access_token, exp = create_access_token(user_id=42, role="runner")
    assert access_token is not None
    assert exp == 900  # 15 minutes = 900 seconds

    refresh_token, jti, exp_date = create_refresh_token(user_id=42)
    assert refresh_token is not None
    assert jti is not None


def test_token_hashing_determinism():
    raw_token = "some_random_secret_token_string"
    h1 = hash_token(raw_token)
    h2 = hash_token(raw_token)
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex string length
