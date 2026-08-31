import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple, Dict, Any, Optional
from jose import jwt, JWTError
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    hash_token,
    create_access_token,
    create_refresh_token,
)
from app.models.user import User, UserRole
from app.models.auth_token import RefreshToken, PasswordResetToken
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefreshResponse,
    UserResponse,
    ResetPasswordRequest,
)
from app.services.email_service import EmailService


class AuthService:
    @classmethod
    async def register(
        cls,
        db: AsyncSession,
        payload: UserRegister,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> TokenResponse:
        # Check duplicate email
        existing_email = await db.execute(select(User).where(User.email == payload.email))
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists",
            )

        # Check duplicate username
        existing_username = await db.execute(select(User).where(User.username == payload.username))
        if existing_username.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken by another runner",
            )

        verify_token = secrets.token_urlsafe(32)

        new_user = User(
            email=payload.email,
            username=payload.username,
            hashed_password=get_password_hash(payload.password),
            full_name=payload.full_name or payload.username,
            role=UserRole.RUNNER.value,
            faction_color=payload.faction_color or "#3B82F6",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.username}",
            is_active=True,
            is_verified=False,
            verification_token=verify_token,
            verification_sent_at=datetime.now(timezone.utc),
        )
        db.add(new_user)
        await db.flush()

        # Send verification email via EmailService
        EmailService.send_verification_email(
            to_email=new_user.email,
            username=new_user.username,
            token=verify_token,
        )

        # Generate Access & Refresh Tokens
        access_token, expires_in = create_access_token(user_id=new_user.id, role=new_user.role)
        refresh_token_str, jti, refresh_expires_at = create_refresh_token(user_id=new_user.id)

        # Save hashed refresh token in database
        db_refresh = RefreshToken(
            user_id=new_user.id,
            token_hash=hash_token(refresh_token_str),
            jti=jti,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        db.add(db_refresh)
        await db.commit()
        await db.refresh(new_user)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in_seconds=expires_in,
            user=UserResponse.model_validate(new_user),
        )

    @classmethod
    async def verify_email(cls, db: AsyncSession, token: str) -> User:
        """Verifies an athlete's email address given their verification token."""
        result = await db.execute(select(User).where(User.verification_token == token))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token",
            )

        user.is_verified = True
        user.verification_token = None
        await db.commit()
        await db.refresh(user)
        return user

    @classmethod
    async def resend_verification(cls, db: AsyncSession, email: str) -> bool:
        """Generates a new verification token and re-sends the verification email."""
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or user.is_verified:
            return True  # Silently succeed to prevent email enumeration

        new_token = secrets.token_urlsafe(32)
        user.verification_token = new_token
        user.verification_sent_at = datetime.now(timezone.utc)
        await db.commit()

        EmailService.send_verification_email(
            to_email=user.email,
            username=user.username,
            token=new_token,
        )
        return True

    @classmethod
    async def login(
        cls,
        db: AsyncSession,
        payload: UserLogin,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> TokenResponse:
        result = await db.execute(
            select(User).where(and_(User.email == payload.email, User.is_deleted == False))
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email address or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been suspended. Please contact support.",
            )

        access_token, expires_in = create_access_token(user_id=user.id, role=user.role)
        refresh_token_str, jti, refresh_expires_at = create_refresh_token(user_id=user.id)

        db_refresh = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token_str),
            jti=jti,
            expires_at=refresh_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        db.add(db_refresh)
        await db.commit()
        await db.refresh(user)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in_seconds=expires_in,
            user=UserResponse.model_validate(user),
        )

    @classmethod
    async def rotate_refresh_token(
        cls,
        db: AsyncSession,
        old_refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> TokenRefreshResponse:
        token_h = hash_token(old_refresh_token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_h))
        stored_token = result.scalar_one_or_none()

        if not stored_token or stored_token.revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or has been revoked",
            )

        if stored_token.expires_at < datetime.now(timezone.utc):
            stored_token.revoked = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please sign in again.",
            )

        user_res = await db.execute(select(User).where(User.id == stored_token.user_id))
        user = user_res.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User account is inactive")

        stored_token.revoked = True
        stored_token.revoked_at = datetime.now(timezone.utc)

        new_access, expires_in = create_access_token(user_id=user.id, role=user.role)
        new_refresh_str, new_jti, new_expires_at = create_refresh_token(user_id=user.id)
        stored_token.replaced_by = new_jti

        new_db_token = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_refresh_str),
            jti=new_jti,
            expires_at=new_expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        db.add(new_db_token)
        await db.commit()

        return TokenRefreshResponse(
            access_token=new_access,
            refresh_token=new_refresh_str,
            token_type="bearer",
            expires_in_seconds=expires_in,
        )

    @classmethod
    async def logout(cls, db: AsyncSession, refresh_token_str: str) -> None:
        token_h = hash_token(refresh_token_str)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_h))
        stored_token = result.scalar_one_or_none()
        if stored_token:
            stored_token.revoked = True
            stored_token.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    @classmethod
    async def create_password_reset_token(cls, db: AsyncSession, email: str) -> Optional[str]:
        result = await db.execute(select(User).where(and_(User.email == email, User.is_deleted == False)))
        user = result.scalar_one_or_none()
        if not user:
            return None

        raw_token = secrets.token_urlsafe(32)
        hashed = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        reset_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=expires_at,
            used=False,
        )
        db.add(reset_entry)
        await db.commit()

        # Send password reset email via EmailService
        EmailService.send_password_reset_email(
            to_email=user.email,
            username=user.username,
            token=raw_token,
        )

        return raw_token

    @classmethod
    async def reset_password(cls, db: AsyncSession, payload: ResetPasswordRequest) -> None:
        hashed = hash_token(payload.token)
        result = await db.execute(
            select(PasswordResetToken).where(
                and_(
                    PasswordResetToken.token_hash == hashed,
                    PasswordResetToken.used == False,
                    PasswordResetToken.expires_at > datetime.now(timezone.utc),
                )
            )
        )
        reset_entry = result.scalar_one_or_none()
        if not reset_entry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token",
            )

        user_res = await db.execute(select(User).where(User.id == reset_entry.user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.hashed_password = get_password_hash(payload.new_password)
        reset_entry.used = True
        reset_entry.used_at = datetime.now(timezone.utc)

        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id)
            .values(revoked=True, revoked_at=datetime.now(timezone.utc))
        )
        await db.commit()
