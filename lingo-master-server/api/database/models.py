"""
SQLAlchemy ORM models for LingoMaster.
Supports both PostgreSQL and SQLite (for testing).
"""
import json
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date, DateTime,
    Text, ForeignKey, BigInteger, UniqueConstraint, Index, TypeDecorator,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from api.database.connection import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(str(value))
        return value


class JSONType(TypeDecorator):
    """Platform-independent JSON type."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value, ensure_ascii=False, default=str)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        return value


class StringArrayType(TypeDecorator):
    """Platform-independent array type stored as JSON."""
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return []
        return value


class User(Base):
    __tablename__ = "users"

    user_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), nullable=False, default="学习者")
    avatar_path = Column(String(500), nullable=True)
    experience_points = Column(Integer, nullable=False, default=0)
    streak_days = Column(Integer, nullable=False, default=0)
    last_study_date = Column(Date, nullable=True)
    settings = Column(JSONType(), nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    learning_records = relationship("LearningRecord", back_populates="user")
    study_plans = relationship("StudyPlan", back_populates="user")
    daily_tasks = relationship("DailyTask", back_populates="user")
    daily_stats = relationship("DailyStat", back_populates="user")
    achievements = relationship("Achievement", back_populates="user")
    devices = relationship("UserDevice", back_populates="user")


class Language(Base):
    __tablename__ = "languages"

    language_code = Column(String(5), primary_key=True)
    language_name = Column(String(50), nullable=False)
    flag_emoji = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    wordbook_categories = relationship("WordbookCategory", back_populates="language")
    wordbooks = relationship("Wordbook", back_populates="language")
    words = relationship("Word", back_populates="language")


class WordbookCategory(Base):
    __tablename__ = "wordbook_categories"

    category_id = Column(Integer, primary_key=True, autoincrement=True)
    language_code = Column(String(5), ForeignKey("languages.language_code"), nullable=False)
    category_type = Column(String(20), nullable=False)  # textbook, grade, scenario, exam, dictionary
    category_name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("wordbook_categories.category_id"), nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    language = relationship("Language", back_populates="wordbook_categories")
    parent = relationship("WordbookCategory", remote_side=[category_id])
    wordbooks = relationship("Wordbook", back_populates="category")


class Wordbook(Base):
    __tablename__ = "wordbooks"

    book_id = Column(String(50), primary_key=True)
    language_code = Column(String(5), ForeignKey("languages.language_code"), nullable=False)
    category_id = Column(Integer, ForeignKey("wordbook_categories.category_id"), nullable=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    word_count = Column(Integer, nullable=False, default=0)
    difficulty = Column(Integer, nullable=False, default=1)
    is_free = Column(Boolean, nullable=False, default=True)
    cover_color = Column(String(7), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    language = relationship("Language", back_populates="wordbooks")
    category = relationship("WordbookCategory", back_populates="wordbooks")
    wordbook_words = relationship("WordbookWord", back_populates="wordbook")


class Word(Base):
    __tablename__ = "words"

    word_id = Column(String(50), primary_key=True)
    language_code = Column(String(5), ForeignKey("languages.language_code"), nullable=False)
    word = Column(String(200), nullable=False)
    phonetic_ipa = Column(String(200), nullable=True)
    meanings = Column(JSONType(), nullable=False)
    word_family = Column(JSONType(), nullable=True)
    frequency_rank = Column(Integer, nullable=True)
    difficulty_level = Column(Integer, default=1)
    tags = Column(StringArrayType(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    language = relationship("Language", back_populates="words")
    wordbook_words = relationship("WordbookWord", back_populates="word")
    learning_records = relationship("LearningRecord", back_populates="word")
    ai_memory_cache = relationship("AIMemoryCache", back_populates="word", uselist=False)
    audio_caches = relationship("AudioCache", back_populates="word")

    __table_args__ = (
        Index("idx_words_language", "language_code"),
        Index("idx_words_frequency", "language_code", "frequency_rank"),
        Index("idx_words_difficulty", "language_code", "difficulty_level"),
    )


class WordbookWord(Base):
    __tablename__ = "wordbook_words"

    book_id = Column(String(50), ForeignKey("wordbooks.book_id"), primary_key=True)
    word_id = Column(String(50), ForeignKey("words.word_id"), primary_key=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    wordbook = relationship("Wordbook", back_populates="wordbook_words")
    word = relationship("Word", back_populates="wordbook_words")


class LearningRecord(Base):
    __tablename__ = "learning_records"

    record_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    word_id = Column(String(50), ForeignKey("words.word_id"), nullable=False)
    easiness_factor = Column(Float, nullable=False, default=2.5)
    repetitions = Column(Integer, nullable=False, default=0)
    interval_days = Column(Integer, nullable=False, default=0)
    next_review_date = Column(Date, nullable=True)
    consecutive_perfect = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="new")
    quality_history = Column(JSONType(), nullable=False, default=list)
    first_learned_at = Column(DateTime(timezone=True), server_default=func.now())
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    mastered_at = Column(DateTime(timezone=True), nullable=True)
    # Sync
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    sync_version = Column(BigInteger, nullable=False, default=1)

    # Relationships
    user = relationship("User", back_populates="learning_records")
    word = relationship("Word", back_populates="learning_records")

    __table_args__ = (
        UniqueConstraint("user_id", "word_id"),
        Index("idx_lr_user_review", "user_id", "next_review_date"),
        Index("idx_lr_user_status", "user_id", "status"),
        Index("idx_lr_sync", "user_id", "sync_version"),
    )


class StudyPlan(Base):
    __tablename__ = "study_plans"

    plan_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    book_id = Column(String(50), ForeignKey("wordbooks.book_id"), nullable=False)
    daily_new_words = Column(Integer, nullable=False, default=20)
    play_count = Column(Integer, nullable=False, default=3)
    start_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="study_plans")
    wordbook = relationship("Wordbook")
    daily_tasks = relationship("DailyTask", back_populates="plan")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    task_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    plan_id = Column(GUID(), ForeignKey("study_plans.plan_id"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    task_date = Column(Date, nullable=False)
    new_target = Column(Integer, nullable=False, default=0)
    new_done = Column(Integer, nullable=False, default=0)
    review_target = Column(Integer, nullable=False, default=0)
    review_done = Column(Integer, nullable=False, default=0)
    time_spent_sec = Column(Integer, nullable=False, default=0)
    completion_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    plan = relationship("StudyPlan", back_populates="daily_tasks")
    user = relationship("User", back_populates="daily_tasks")

    __table_args__ = (
        UniqueConstraint("plan_id", "task_date"),
        Index("idx_dt_user_date", "user_id", "task_date"),
    )


class DailyStat(Base):
    __tablename__ = "daily_stats"

    stat_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    stat_date = Column(Date, nullable=False)
    new_words_learned = Column(Integer, nullable=False, default=0)
    words_reviewed = Column(Integer, nullable=False, default=0)
    words_mastered = Column(Integer, nullable=False, default=0)
    time_spent_sec = Column(Integer, nullable=False, default=0)
    review_pass_rate = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="daily_stats")

    __table_args__ = (
        UniqueConstraint("user_id", "stat_date"),
    )


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    achievement_key = Column(String(50), nullable=False)
    achievement_name = Column(String(100), nullable=False)
    achievement_type = Column(String(20), nullable=False)
    icon = Column(String(10), nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="achievements")

    __table_args__ = (
        UniqueConstraint("user_id", "achievement_key"),
    )


class AIMemoryCache(Base):
    __tablename__ = "ai_memory_cache"

    cache_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    word_id = Column(String(50), ForeignKey("words.word_id"), nullable=False, unique=True)
    language_code = Column(String(5), nullable=False)
    memory_aids = Column(JSONType(), nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    word = relationship("Word", back_populates="ai_memory_cache")


class AudioCache(Base):
    __tablename__ = "audio_cache"

    audio_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    word_id = Column(String(50), ForeignKey("words.word_id"), nullable=False)
    tts_engine = Column(String(20), nullable=False)
    file_path = Column(String(500), nullable=False)
    duration_ms = Column(Integer, nullable=True)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    word = relationship("Word", back_populates="audio_caches")

    __table_args__ = (
        UniqueConstraint("word_id", "tts_engine"),
    )


class UserDevice(Base):
    __tablename__ = "user_devices"

    device_id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.user_id"), nullable=False)
    device_name = Column(String(100), nullable=True)
    device_token = Column(String(500), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_version = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="devices")
