"""
Pydantic models for user operations.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date, datetime


class UserProfile(BaseModel):
    user_id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    nickname: str
    avatar_path: Optional[str] = None
    experience_points: int = 0
    streak_days: int = 0
    last_study_date: Optional[date] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UpdateUserRequest(BaseModel):
    nickname: Optional[str] = Field(None, max_length=50)
    avatar_path: Optional[str] = None


class UserSettings(BaseModel):
    playback_count: int = 3
    playback_speed: float = 1.0
    prefer_remote_tts: bool = True
    daily_reminder_enabled: bool = True
    reminder_time: str = "20:00"
    auto_play: bool = True
    interval_between_plays: float = 1.5


class UpdateSettingsRequest(BaseModel):
    settings: Dict[str, Any]
