"""
Pydantic models for authentication.
"""
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class RegisterRequest(BaseModel):
    phone_or_email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    nickname: str = Field(default="学习者", max_length=50)

    @field_validator("phone_or_email")
    @classmethod
    def validate_phone_or_email(cls, v: str) -> str:
        # Check if it's an email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        phone_pattern = r'^\+?\d{7,20}$'
        if not re.match(email_pattern, v) and not re.match(phone_pattern, v):
            raise ValueError("请输入有效的手机号或邮箱地址")
        return v


class LoginRequest(BaseModel):
    phone_or_email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    device_name: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user_id: str
    access_token: str
    refresh_token: str
    expires_in: int  # seconds


class TokenRefreshResponse(BaseModel):
    access_token: str
    expires_in: int
