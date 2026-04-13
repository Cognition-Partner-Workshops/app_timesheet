"""
Authentication service - handles user registration, login, and token management.
"""
import re
from typing import Optional
from uuid import UUID

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.database.models import User, UserDevice
from api.auth.jwt_handler import create_access_token, create_refresh_token, decode_token
from api.auth.models import RegisterRequest, LoginRequest, AuthResponse, TokenRefreshResponse

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def is_email(value: str) -> bool:
    """Check if the value is an email address."""
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value))


class AuthService:
    """Authentication service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, request: RegisterRequest) -> AuthResponse:
        """Register a new user."""
        # Check if user already exists
        if is_email(request.phone_or_email):
            query = select(User).where(User.email == request.phone_or_email)
        else:
            query = select(User).where(User.phone == request.phone_or_email)

        result = await self.db.execute(query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise ValueError("手机号/邮箱已注册")

        # Create new user
        user = User(
            password_hash=hash_password(request.password),
            nickname=request.nickname,
        )

        if is_email(request.phone_or_email):
            user.email = request.phone_or_email
        else:
            user.phone = request.phone_or_email

        self.db.add(user)
        await self.db.flush()

        # Generate tokens
        access_token = create_access_token(str(user.user_id))
        refresh_token = create_refresh_token(str(user.user_id))

        return AuthResponse(
            user_id=str(user.user_id),
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def login(self, request: LoginRequest) -> AuthResponse:
        """Login with phone/email and password."""
        # Find user
        if is_email(request.phone_or_email):
            query = select(User).where(User.email == request.phone_or_email)
        else:
            query = select(User).where(User.phone == request.phone_or_email)

        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user or not verify_password(request.password, user.password_hash):
            raise ValueError("账号或密码错误")

        # Register device if provided
        if request.device_name:
            device = UserDevice(
                user_id=user.user_id,
                device_name=request.device_name,
            )
            self.db.add(device)

        # Generate tokens
        access_token = create_access_token(str(user.user_id))
        refresh_token = create_refresh_token(str(user.user_id))

        return AuthResponse(
            user_id=str(user.user_id),
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh_token(self, refresh_token_str: str) -> TokenRefreshResponse:
        """Refresh an access token."""
        try:
            payload = decode_token(refresh_token_str)
        except ValueError as e:
            raise ValueError(str(e))

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = payload["sub"]

        # Verify user exists
        query = select(User).where(User.user_id == UUID(user_id))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("User not found")

        new_access_token = create_access_token(user_id)

        return TokenRefreshResponse(
            access_token=new_access_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        query = select(User).where(User.user_id == UUID(user_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
