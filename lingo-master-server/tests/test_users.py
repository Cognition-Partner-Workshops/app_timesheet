"""
User management module tests.
Tests: get profile, update profile, settings management, experience/streak.
"""
import pytest
from uuid import uuid4

from api.users.service import UserService
from api.users.models import UpdateUserRequest, UpdateSettingsRequest


class TestUserService:
    """Test user management service."""

    @pytest.mark.asyncio
    async def test_get_profile(self, seeded_db):
        """Test getting user profile."""
        db, user = seeded_db
        service = UserService(db)
        profile = await service.get_profile(str(user.user_id))
        assert profile is not None
        assert profile.nickname == "测试用户"
        assert profile.email == "test@lingomaster.com"

    @pytest.mark.asyncio
    async def test_get_nonexistent_profile(self, seeded_db):
        db, _ = seeded_db
        service = UserService(db)
        with pytest.raises(ValueError):
            await service.get_profile(str(uuid4()))

    @pytest.mark.asyncio
    async def test_update_profile(self, seeded_db):
        """Test updating user profile."""
        db, user = seeded_db
        service = UserService(db)
        request = UpdateUserRequest(nickname="新昵称")
        updated = await service.update_profile(str(user.user_id), request)
        assert updated is not None
        assert updated.nickname == "新昵称"

    @pytest.mark.asyncio
    async def test_get_settings(self, seeded_db):
        """Test getting user settings."""
        db, user = seeded_db
        service = UserService(db)
        settings = await service.get_settings(str(user.user_id))
        assert settings is not None

    @pytest.mark.asyncio
    async def test_update_settings(self, seeded_db):
        """Test updating user settings."""
        db, user = seeded_db
        service = UserService(db)
        request = UpdateSettingsRequest(settings={"daily_goal": 30})
        updated = await service.update_settings(str(user.user_id), request)
        assert updated is not None
        assert updated["daily_goal"] == 30

    @pytest.mark.asyncio
    async def test_add_experience(self, seeded_db):
        """Test adding experience points."""
        db, user = seeded_db
        service = UserService(db)
        result = await service.add_experience(str(user.user_id), 50)
        assert result is not None
        assert result >= 50

    @pytest.mark.asyncio
    async def test_update_streak(self, seeded_db):
        """Test updating streak days."""
        db, user = seeded_db
        service = UserService(db)
        await service.update_streak(str(user.user_id), 5)
        # Verify streak was updated
        profile = await service.get_profile(str(user.user_id))
        assert profile.streak_days == 5
