import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter (A-Z)")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number (0-9)")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character (!@#$%^&*)")
    return password


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None
    full_name: Optional[str] = Field(None, max_length=150)
    faction_color: Optional[str] = "#3B82F6"

    @field_validator("password")
    def password_rules(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_password and self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = False


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, description="Valid long-lived refresh token")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)
    confirm_new_password: Optional[str] = None

    @field_validator("new_password")
    def password_rules(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_new_password and self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: Optional[str] = None

    @field_validator("new_password")
    def password_rules(cls, v: str) -> str:
        return validate_password_strength(v)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.confirm_new_password and self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str = "runner"
    avatar_url: Optional[str] = None
    level: int
    xp: int
    total_distance_km: float
    total_territory_km2: float
    faction_color: str
    resting_hr: int
    max_hr: int
    is_verified: bool = False
    is_strava_connected: bool = False
    health_conditions: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = 900  # 15 mins
    user: UserResponse


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = 900


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=150)
    avatar_url: Optional[str] = Field(None, max_length=500)
    resting_hr: Optional[int] = Field(None, ge=30, le=120)
    max_hr: Optional[int] = Field(None, ge=120, le=240)
    weight_kg: Optional[float] = Field(None, ge=30, le=250)
    faction_color: Optional[str] = Field(None, max_length=20)
    health_conditions: Optional[str] = Field(None, max_length=500)
