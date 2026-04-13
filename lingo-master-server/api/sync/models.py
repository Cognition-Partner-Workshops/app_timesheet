"""
Pydantic models for data sync operations.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime


class LearningRecordSync(BaseModel):
    record_id: str
    user_id: str
    word_id: str
    easiness_factor: float = 2.5
    repetitions: int = 0
    interval_days: int = 0
    next_review_date: Optional[date] = None
    consecutive_perfect: int = 0
    status: str = "new"
    quality_history: List[Dict[str, Any]] = []
    first_learned_at: Optional[datetime] = None
    last_reviewed_at: Optional[datetime] = None
    mastered_at: Optional[datetime] = None
    updated_at: datetime
    sync_version: int = 1


class DailyStatSync(BaseModel):
    stat_id: str
    user_id: str
    stat_date: date
    new_words_learned: int = 0
    words_reviewed: int = 0
    words_mastered: int = 0
    time_spent_sec: int = 0
    review_pass_rate: float = 0.0


class StudyPlanSync(BaseModel):
    plan_id: str
    user_id: str
    book_id: str
    daily_new_words: int = 20
    play_count: int = 3
    start_date: date
    target_date: date
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DailyTaskSync(BaseModel):
    task_id: str
    plan_id: str
    user_id: str
    task_date: date
    new_target: int = 0
    new_done: int = 0
    review_target: int = 0
    review_done: int = 0
    time_spent_sec: int = 0
    completion_rate: float = 0.0


class AchievementSync(BaseModel):
    id: str
    user_id: str
    achievement_key: str
    achievement_name: str
    achievement_type: str
    icon: str = ""
    earned_at: Optional[datetime] = None


class SyncChanges(BaseModel):
    learning_records: List[LearningRecordSync] = []
    daily_stats: List[DailyStatSync] = []
    study_plans: List[StudyPlanSync] = []
    daily_tasks: List[DailyTaskSync] = []
    achievements: List[AchievementSync] = []


class PushRequest(BaseModel):
    device_id: str
    changes: SyncChanges
    last_sync_version: int


class ConflictRecord(BaseModel):
    record_type: str
    record_id: str
    server_version: Dict[str, Any]
    client_version: Dict[str, Any]


class PushResponse(BaseModel):
    accepted: int
    conflicts: List[ConflictRecord] = []
    new_sync_version: int


class PullRequest(BaseModel):
    device_id: str
    last_sync_version: int


class PullResponse(BaseModel):
    changes: SyncChanges
    current_sync_version: int


class SyncStatusResponse(BaseModel):
    last_sync_at: Optional[datetime] = None
    current_sync_version: int = 0
    pending_changes: int = 0
