"""
Seed data script - creates initial languages, categories, wordbooks, and sample words.
Run this after database initialization.
"""
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from api.database.connection import Base
from api.database.models import Language, WordbookCategory, Wordbook, Word, WordbookWord
from api.config import get_settings


async def seed_languages(session: AsyncSession):
    """Seed supported languages."""
    languages = [
        Language(language_code="en", language_name="英语", flag_emoji="🇬🇧", is_active=True, sort_order=1),
        Language(language_code="fr", language_name="法语", flag_emoji="🇫🇷", is_active=True, sort_order=2),
        Language(language_code="ja", language_name="日语", flag_emoji="🇯🇵", is_active=True, sort_order=3),
        Language(language_code="de", language_name="德语", flag_emoji="🇩🇪", is_active=True, sort_order=4),
        Language(language_code="es", language_name="西班牙语", flag_emoji="🇪🇸", is_active=True, sort_order=5),
    ]
    for lang in languages:
        session.add(lang)
    await session.flush()
    print("✓ Languages seeded")


async def seed_categories(session: AsyncSession):
    """Seed wordbook categories."""
    categories = [
        # English
        WordbookCategory(language_code="en", category_type="exam", category_name="考试词汇", sort_order=1),
        WordbookCategory(language_code="en", category_type="grade", category_name="分级词汇", sort_order=2),
        WordbookCategory(language_code="en", category_type="scenario", category_name="场景词汇", sort_order=3),
        WordbookCategory(language_code="en", category_type="textbook", category_name="教材词汇", sort_order=4),
        # Japanese
        WordbookCategory(language_code="ja", category_type="exam", category_name="JLPT考试", sort_order=1),
        WordbookCategory(language_code="ja", category_type="textbook", category_name="教材词汇", sort_order=2),
        # French
        WordbookCategory(language_code="fr", category_type="grade", category_name="分级词汇", sort_order=1),
        # German
        WordbookCategory(language_code="de", category_type="grade", category_name="分级词汇", sort_order=1),
        # Spanish
        WordbookCategory(language_code="es", category_type="grade", category_name="分级词汇", sort_order=1),
    ]
    for cat in categories:
        session.add(cat)
    await session.flush()
    print("✓ Categories seeded")


async def seed_wordbooks(session: AsyncSession):
    """Seed sample wordbooks."""
    wordbooks = [
        Wordbook(book_id="en_cet4", language_code="en", category_id=1, name="CET-4核心词汇",
                  description="大学英语四级考试核心词汇2000词", word_count=2000, difficulty=2,
                  is_free=True, cover_color="#4A90D9", sort_order=1),
        Wordbook(book_id="en_cet6", language_code="en", category_id=1, name="CET-6核心词汇",
                  description="大学英语六级考试核心词汇3000词", word_count=3000, difficulty=3,
                  is_free=True, cover_color="#7B68EE", sort_order=2),
        Wordbook(book_id="en_toefl", language_code="en", category_id=1, name="TOEFL核心词汇",
                  description="托福考试核心词汇4000词", word_count=4000, difficulty=4,
                  is_free=True, cover_color="#FF6347", sort_order=3),
        Wordbook(book_id="en_daily", language_code="en", category_id=3, name="日常会话800词",
                  description="日常英语会话高频词汇", word_count=800, difficulty=1,
                  is_free=True, cover_color="#87CEEB", sort_order=6),
        Wordbook(book_id="ja_n5", language_code="ja", category_id=5, name="JLPT N5词汇",
                  description="日本语能力测试N5基础词汇800词", word_count=800, difficulty=1,
                  is_free=True, cover_color="#FF69B4", sort_order=1),
    ]
    for wb in wordbooks:
        session.add(wb)
    await session.flush()
    print("✓ Wordbooks seeded")


async def seed_sample_words(session: AsyncSession):
    """Seed sample English words."""
    words = [
        Word(word_id="en_abandon", language_code="en", word="abandon", phonetic_ipa="/əˈbændən/",
             meanings=[{"pos": "vt.", "definition_zh": "放弃，遗弃", "definition_en": "to give up completely",
                         "example": "He abandoned his wife.", "example_zh": "他抛弃了妻子。"}],
             frequency_rank=1500, difficulty_level=2, tags=["CET-4", "高频"]),
        Word(word_id="en_ability", language_code="en", word="ability", phonetic_ipa="/əˈbɪləti/",
             meanings=[{"pos": "n.", "definition_zh": "能力，才能", "definition_en": "the power to do something",
                         "example": "She has great ability.", "example_zh": "她很有才能。"}],
             frequency_rank=800, difficulty_level=1, tags=["CET-4", "基础"]),
        Word(word_id="en_accept", language_code="en", word="accept", phonetic_ipa="/əkˈsept/",
             meanings=[{"pos": "vt.", "definition_zh": "接受，承认", "definition_en": "to receive willingly",
                         "example": "Please accept my apology.", "example_zh": "请接受我的道歉。"}],
             frequency_rank=500, difficulty_level=1, tags=["CET-4", "基础"]),
        Word(word_id="en_achieve", language_code="en", word="achieve", phonetic_ipa="/əˈtʃiːv/",
             meanings=[{"pos": "vt.", "definition_zh": "达到，完成", "definition_en": "to successfully reach a goal",
                         "example": "She achieved her dream.", "example_zh": "她实现了梦想。"}],
             frequency_rank=1200, difficulty_level=2, tags=["CET-4", "考研"]),
        Word(word_id="en_action", language_code="en", word="action", phonetic_ipa="/ˈækʃən/",
             meanings=[{"pos": "n.", "definition_zh": "行动，行为", "definition_en": "the process of doing something",
                         "example": "Take action now.", "example_zh": "现在采取行动。"}],
             frequency_rank=300, difficulty_level=1, tags=["CET-4", "基础"]),
    ]
    for w in words:
        session.add(w)
    await session.flush()

    # Link to wordbook
    for i, w in enumerate(words):
        wbw = WordbookWord(book_id="en_cet4", word_id=w.word_id, sort_order=i + 1)
        session.add(wbw)
    await session.flush()
    print("✓ Sample words seeded")


async def main():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        try:
            await seed_languages(session)
            await seed_categories(session)
            await seed_wordbooks(session)
            await seed_sample_words(session)
            await session.commit()
            print("\n✅ All seed data inserted successfully!")
        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error seeding data: {e}")
            raise
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
