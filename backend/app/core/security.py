import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union, List, Tuple
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.auth_token import RefreshToken, PasswordResetToken

security_bearer = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash using native bcrypt."""
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash using native bcrypt."""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def hash_token(token_str: str) -> str:
    """Deterministic SHA-256 hash for storing refresh and reset tokens securely in DB."""
    return hashlib.sha256(token_str.encode("utf-8")).hexdigest()


def create_access_token(user_id: int, role: str = "runner") -> Tuple[str, int]:
    """
    Generate short-lived JWT access token (15 mins).
    Returns (token_string, expires_in_seconds).
    """
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt, int(expires_delta.total_seconds())


def create_refresh_token(user_id: int) -> Tuple[str, str, datetime]:
    """
    Generate long-lived refresh token (7 days) with unique JTI for tracking & rotation.
    Returns (token_string, jti, expires_at).
    """
    jti = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "refresh",
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt, jti, expires_at


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authentication Middleware:
    Extracts and validates the short-lived Bearer access token,
    checks if user exists, is active, and is not soft-deleted.
    """
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_type = payload.get("type")
        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type. Access token required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired or is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await db.execute(select(User).where(and_(User.id == user_id, User.is_deleted == False)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    return user


async def get_current_user_id(current_user: User = Depends(get_current_user)) -> int:
    """Convenience dependency to retrieve the authenticated user's ID."""
    return current_user.id



async def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Optional authentication dependency:
    Returns User instance if valid token provided, else None without raising 401.
    """
    if not auth or not auth.credentials:
        return None
    try:
        payload = jwt.decode(auth.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            return None
        user_id = int(user_id_str)
        result = await db.execute(select(User).where(and_(User.id == user_id, User.is_deleted == False)))
        return result.scalar_one_or_none()
    except Exception:
        return None


def require_role(allowed_roles: List[str]):
    """
    Authorization Middleware (RBAC):
    Ensures the authenticated user possesses one of the allowed roles.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of the following roles: {allowed_roles}",
            )
        return current_user
    return role_checker


def verify_resource_ownership(resource_owner_id: int, current_user: User, resource_name: str = "resource") -> None:
    """
    IDOR / BOLA Prevention Guard:
    Ensures that the current user owns the specified resource or is an admin.
    """
    if current_user.role == UserRole.ADMIN.value:
        return
    if resource_owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to access or modify this {resource_name}",
        )
