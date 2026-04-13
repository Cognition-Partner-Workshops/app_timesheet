"""
Test configuration and fixtures for LingoMaster backend tests.
Uses SQLite in-memory database for isolated testing.
"""
import asyncio
import os
import sys
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database.connection import Base
from api.database.models import (
    User, Language, WordbookCategory, Wordbook, Word, WordbookWord,
)
from api.auth.service import hash_password


# Use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine):
    """Create test database session."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def seeded_db(db_session):
    """Database session with seed data."""
    # Languages
    languages = [
        Language(language_code="en", language_name="英语", flag_emoji="🇬🇧", is_active=True, sort_order=1),
        Language(language_code="ja", language_name="日语", flag_emoji="🇯🇵", is_active=True, sort_order=2),
        Language(language_code="fr", language_name="法语", flag_emoji="🇫🇷", is_active=True, sort_order=3),
    ]
    for lang in languages:
        db_session.add(lang)
    await db_session.flush()

    # Categories
    cat1 = WordbookCategory(language_code="en", category_type="exam", category_name="考试词汇", sort_order=1)
    cat2 = WordbookCategory(language_code="en", category_type="grade", category_name="分级词汇", sort_order=2)
    db_session.add(cat1)
    db_session.add(cat2)
    await db_session.flush()

    # Wordbook
    wb = Wordbook(
        book_id="en_test", language_code="en", category_id=cat1.category_id,
        name="测试词库", description="用于测试的词库", word_count=5,
        difficulty=2, is_free=True, cover_color="#4A90D9", sort_order=1
    )
    db_session.add(wb)
    await db_session.flush()

    # Words
    words_data = [
        ("en_hello", "en", "hello", "/həˈloʊ/", 100, 1),
        ("en_world", "en", "world", "/wɜːrld/", 200, 1),
        ("en_python", "en", "python", "/ˈpaɪθɑːn/", 5000, 3),
        ("en_algorithm", "en", "algorithm", "/ˈælɡərɪðəm/", 8000, 4),
        ("en_quantum", "en", "quantum", "/ˈkwɑːntəm/", 15000, 5),
    ]
    for wid, lang, word, phonetic, freq, diff in words_data:
        w = Word(
            word_id=wid, language_code=lang, word=word, phonetic_ipa=phonetic,
            meanings=[{"pos": "n.", "definition_zh": f"{word}的释义", "definition_en": f"meaning of {word}"}],
            frequency_rank=freq, difficulty_level=diff, tags=["test"]
        )
        db_session.add(w)
    await db_session.flush()

    # Link words to wordbook
    for i, (wid, *_) in enumerate(words_data):
        wbw = WordbookWord(book_id="en_test", word_id=wid, sort_order=i + 1)
        db_session.add(wbw)
    await db_session.flush()

    # Test user
    hashed_pw = hash_password("test123456")
    user = User(
        user_id=uuid4(),
        email="test@lingomaster.com",
        password_hash=hashed_pw,
        nickname="测试用户",
        experience_points=0,
        streak_days=0,
    )
    db_session.add(user)
    await db_session.flush()

    await db_session.commit()

    yield db_session, user


@pytest.fixture
def sample_user_data():
    """Sample user registration data."""
    return {
        "account": f"test_{uuid4().hex[:8]}@lingomaster.com",
        "password": "Test123456!",
        "nickname": "测试新用户",
    }
