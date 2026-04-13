"""
User service - handles user profile and settings management.
"""
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.models import User
from api.users.models import UserProfile, UpdateUserRequest, UpdateSettingsRequest


class UserService:
    """User management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_profile(self, user_id: str) -> UserProfile:
        """Get user profile."""
        query = select(User).where(User.user_id == UUID(user_id))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("用户不存在")

        return UserProfile(
            user_id=str(user.user_id),
            phone=user.phone,
            email=user.email,
            nickname=user.nickname,
            avatar_path=user.avatar_path,
            experience_points=user.experience_points,
            streak_days=user.streak_days,
            last_study_date=user.last_study_date,
            created_at=user.created_at,
        )

    async def update_profile(self, user_id: str, request: UpdateUserRequest) -> UserProfile:
        """Update user profile."""
        update_data = request.model_dump(exclude_none=True)
        if not update_data:
            return await self.get_profile(user_id)

        stmt = (
            update(User)
            .where(User.user_id == UUID(user_id))
            .values(**update_data)
        )
        await self.db.execute(stmt)
        await self.db.flush()

        return await self.get_profile(user_id)

    async def get_settings(self, user_id: str) -> dict:
        """Get user settings."""
        query = select(User.settings).where(User.user_id == UUID(user_id))
        result = await self.db.execute(query)
        settings = result.scalar_one_or_none()
        if settings is None:
            raise ValueError("用户不存在")
        return settings or {}

    async def update_settings(self, user_id: str, request: UpdateSettingsRequest) -> dict:
        """Update user settings."""
        # Merge with existing settings
        current = await self.get_settings(user_id)
        current.update(request.settings)

        stmt = (
            update(User)
            .where(User.user_id == UUID(user_id))
            .values(settings=current)
        )
        await self.db.execute(stmt)
        await self.db.flush()

        return current

    async def add_experience(self, user_id: str, points: int) -> int:
        """Add experience points to user."""
        query = select(User).where(User.user_id == UUID(user_id))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("用户不存在")

        new_points = user.experience_points + points
        stmt = (
            update(User)
            .where(User.user_id == UUID(user_id))
            .values(experience_points=new_points)
        )
        await self.db.execute(stmt)
        await self.db.flush()

        return new_points

    async def update_streak(self, user_id: str, streak_days: int) -> None:
        """Update user streak days."""
        stmt = (
            update(User)
            .where(User.user_id == UUID(user_id))
            .values(streak_days=streak_days)
        )
        await self.db.execute(stmt)
        await self.db.flush()
