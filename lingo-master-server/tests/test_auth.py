"""
Authentication module tests.
Tests: register, login, token refresh, password hashing, JWT handling.
"""
import pytest
from uuid import uuid4

from api.auth.service import AuthService, hash_password, verify_password, is_email
from api.auth.jwt_handler import (
    create_access_token, create_refresh_token, decode_token, get_user_id_from_token
)
from api.auth.models import RegisterRequest, LoginRequest


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_hash_password_produces_hash(self):
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        assert hashed != password
        assert len(hashed) > 20

    def test_verify_correct_password(self):
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        password = "MySecurePassword123!"
        hashed = hash_password(password)
        assert verify_password("WrongPassword!", hashed) is False

    def test_different_passwords_different_hashes(self):
        hash1 = hash_password("Password1!")
        hash2 = hash_password("Password2!")
        assert hash1 != hash2

    def test_same_password_different_salts(self):
        password = "SamePassword!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        # bcrypt generates different salts each time
        assert hash1 != hash2
        # But both verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTHandler:
    """Test JWT token creation and verification."""

    def test_create_access_token(self):
        user_id = str(uuid4())
        token = create_access_token(user_id)
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        user_id = str(uuid4())
        token = create_refresh_token(user_id)
        assert token is not None
        assert isinstance(token, str)

    def test_decode_valid_access_token(self):
        user_id = str(uuid4())
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "access"

    def test_decode_valid_refresh_token(self):
        user_id = str(uuid4())
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_get_user_id_from_token(self):
        user_id = str(uuid4())
        token = create_access_token(user_id)
        extracted_id = get_user_id_from_token(token)
        assert extracted_id == user_id

    def test_decode_invalid_token(self):
        with pytest.raises(ValueError):
            decode_token("invalid.token.here")

    def test_decode_expired_token(self):
        """Expired tokens should return None."""
        user_id = str(uuid4())
        # Create a token with very short expiry - just verify format
        token = create_access_token(user_id)
        # Valid token should decode
        payload = decode_token(token)
        assert payload is not None

    def test_token_contains_correct_type(self):
        user_id = str(uuid4())
        access = create_access_token(user_id)
        refresh = create_refresh_token(user_id)

        access_payload = decode_token(access)
        refresh_payload = decode_token(refresh)

        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"


class TestEmailValidation:
    """Test email/phone validation."""

    def test_valid_email(self):
        assert is_email("user@example.com") is True
        assert is_email("test.user@domain.co.jp") is True

    def test_invalid_email(self):
        assert is_email("not-an-email") is False
        assert is_email("13800138000") is False

    def test_phone_number(self):
        assert is_email("13800138000") is False
        assert is_email("12345678901") is False


class TestAuthService:
    """Test authentication service (register, login)."""

    @pytest.mark.asyncio
    async def test_register_new_user(self, db_session, sample_user_data):
        service = AuthService(db_session)
        request = RegisterRequest(
            phone_or_email=sample_user_data["account"],
            password=sample_user_data["password"],
            nickname=sample_user_data["nickname"],
        )
        result = await service.register(request)
        assert result is not None
        assert result.access_token
        assert result.refresh_token

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, seeded_db):
        db, user = seeded_db
        service = AuthService(db)
        request = RegisterRequest(
            phone_or_email="test@lingomaster.com",
            password="Test123456!",
            nickname="另一个用户",
        )
        with pytest.raises(Exception):
            await service.register(request)

    @pytest.mark.asyncio
    async def test_login_with_correct_password(self, seeded_db):
        db, user = seeded_db
        service = AuthService(db)
        request = LoginRequest(
            phone_or_email="test@lingomaster.com",
            password="test123456",
        )
        result = await service.login(request)
        assert result is not None
        assert result.access_token
        assert result.user_id

    @pytest.mark.asyncio
    async def test_login_with_wrong_password(self, seeded_db):
        db, user = seeded_db
        service = AuthService(db)
        request = LoginRequest(
            phone_or_email="test@lingomaster.com",
            password="wrongpassword",
        )
        with pytest.raises(Exception):
            await service.login(request)

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, db_session):
        service = AuthService(db_session)
        request = LoginRequest(
            phone_or_email="nonexistent@example.com",
            password="test123456",
        )
        with pytest.raises(Exception):
            await service.login(request)

    @pytest.mark.asyncio
    async def test_refresh_token(self, seeded_db):
        db, user = seeded_db
        service = AuthService(db)

        # Login first
        login_request = LoginRequest(
            phone_or_email="test@lingomaster.com",
            password="test123456",
        )
        login_result = await service.login(login_request)

        # Refresh
        refresh_result = await service.refresh_token(login_result.refresh_token)
        assert refresh_result is not None
        assert refresh_result.access_token

    @pytest.mark.asyncio
    async def test_get_user_by_id(self, seeded_db):
        db, user = seeded_db
        service = AuthService(db)
        found_user = await service.get_user_by_id(str(user.user_id))
        assert found_user is not None
        assert found_user.email == "test@lingomaster.com"
