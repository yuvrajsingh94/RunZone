from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefreshResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    UserResponse,
    UserUpdate,
)
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])


@router.post("/register", response_model=APIResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Enterprise Signup:
    Validates credentials, hashes password, sends email verification, and generates session tokens.
    """
    user_agent = request.headers.get("User-Agent")
    ip = request.client.host if request.client else None

    token_data = await AuthService.register(db, payload, user_agent=user_agent, ip_address=ip)
    return APIResponse(
        success=True,
        message="Athlete registration successful. Verification link sent to your email.",
        data=token_data,
    )


@router.post("/verify-email", response_model=APIResponse[dict])
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Email Verification Confirmation:
    Validates token and activates verified athlete status.
    """
    user = await AuthService.verify_email(db, payload.token)
    return APIResponse(
        success=True,
        message=f"Email address {user.email} has been successfully verified.",
        data={"verified": True, "email": user.email},
    )


@router.post("/resend-verification", response_model=APIResponse[dict])
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Resends athlete verification email with a fresh secure token.
    """
    await AuthService.resend_verification(db, payload.email)
    return APIResponse(
        success=True,
        message="If an unverified account exists for this email, a verification link has been sent.",
        data={"sent": True},
    )


@router.post("/login", response_model=APIResponse[TokenResponse])
async def login(
    payload: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Enterprise Login:
    Validates credentials, generates short-lived access token + rotated refresh token.
    """
    user_agent = request.headers.get("User-Agent")
    ip = request.client.host if request.client else None

    token_data = await AuthService.login(db, payload, user_agent=user_agent, ip_address=ip)
    return APIResponse(
        success=True,
        message="Authentication successful",
        data=token_data,
    )


@router.post("/refresh", response_model=APIResponse[TokenRefreshResponse])
async def refresh_tokens(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Token Refresh with Rotation & Replay Protection:
    Exchanges a valid refresh token for a brand new access + refresh token pair.
    """
    user_agent = request.headers.get("User-Agent")
    ip = request.client.host if request.client else None

    tokens = await AuthService.rotate_refresh_token(db, payload.refresh_token, user_agent, ip)
    return APIResponse(
        success=True,
        message="Tokens rotated successfully",
        data=tokens,
    )


@router.post("/logout", response_model=APIResponse[dict])
async def logout(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Secure Logout:
    Invalidates the refresh token in the database to prevent session reuse.
    """
    await AuthService.logout(db, payload.refresh_token)
    return APIResponse(
        success=True,
        message="Successfully signed out. Session invalidated.",
        data={"revoked": True},
    )


@router.post("/forgot-password", response_model=APIResponse[dict])
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Password Reset Initiation:
    Generates a secure 30-minute token and sends password reset email instructions.
    """
    raw_token = await AuthService.create_password_reset_token(db, payload.email)
    return APIResponse(
        success=True,
        message="If this email is registered, password reset instructions have been sent.",
        data={"dev_reset_token": raw_token} if raw_token else {},
    )


@router.post("/reset-password", response_model=APIResponse[dict])
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Password Reset Execution:
    Validates the token, updates the bcrypt password hash, and terminates all active sessions.
    """
    await AuthService.reset_password(db, payload)
    return APIResponse(
        success=True,
        message="Password has been successfully updated. Please sign in with your new password.",
        data={"updated": True},
    )


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Current Authenticated Athlete Profile.
    """
    return APIResponse(
        success=True,
        message="Profile retrieved successfully",
        data=UserResponse.model_validate(current_user),
    )


@router.patch("/me", response_model=APIResponse[UserResponse])
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update Athlete Profile Settings.
    """
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    if payload.resting_hr is not None:
        current_user.resting_hr = payload.resting_hr
    if payload.max_hr is not None:
        current_user.max_hr = payload.max_hr
    if payload.weight_kg is not None:
        current_user.weight_kg = payload.weight_kg
    if payload.faction_color is not None:
        current_user.faction_color = payload.faction_color
    if payload.health_conditions is not None:
        current_user.health_conditions = payload.health_conditions

    await db.commit()
    await db.refresh(current_user)

    return APIResponse(
        success=True,
        message="Profile updated successfully",
        data=UserResponse.model_validate(current_user),
    )
