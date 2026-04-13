"""
Word and wordbook service.
"""
from typing import List, Optional
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.models import (
    Language, WordbookCategory, Wordbook, Word, WordbookWord
)
from api.words.models import (
    LanguageSchema, CategorySchema, WordbookSchema, WordSchema,
    WordMeaningSchema, WordFamilySchema, WordbookListResponse,
    WordListResponse, WordbookDetailResponse, SearchResponse,
)


def word_to_schema(word: Word) -> WordSchema:
    """Convert a Word ORM model to a WordSchema."""
    meanings = []
    if word.meanings:
        for m in word.meanings:
            meanings.append(WordMeaningSchema(
                pos=m.get("pos", ""),
                definition_zh=m.get("definition_zh", ""),
                definition_en=m.get("definition_en"),
                example=m.get("example"),
                example_zh=m.get("example_zh"),
            ))

    word_family = None
    if word.word_family:
        word_family = WordFamilySchema(
            root=word.word_family.get("root"),
            prefix=word.word_family.get("prefix"),
            suffix=word.word_family.get("suffix"),
            etymology=word.word_family.get("etymology"),
            related=word.word_family.get("related"),
        )

    return WordSchema(
        word_id=word.word_id,
        language_code=word.language_code,
        word=word.word,
        phonetic_ipa=word.phonetic_ipa,
        meanings=meanings,
        word_family=word_family,
        frequency_rank=word.frequency_rank,
        difficulty_level=word.difficulty_level,
        tags=word.tags,
    )


class WordService:
    """Word and wordbook management service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_languages(self) -> List[LanguageSchema]:
        """Get all active languages."""
        query = (
            select(Language)
            .where(Language.is_active.is_(True))
            .order_by(Language.sort_order)
        )
        result = await self.db.execute(query)
        languages = result.scalars().all()

        return [
            LanguageSchema(
                code=lang.language_code,
                name=lang.language_name,
                flag=lang.flag_emoji,
                is_active=lang.is_active,
            )
            for lang in languages
        ]

    async def get_categories(self, language_code: str) -> List[CategorySchema]:
        """Get category tree for a language."""
        query = (
            select(WordbookCategory)
            .where(WordbookCategory.language_code == language_code)
            .order_by(WordbookCategory.sort_order)
        )
        result = await self.db.execute(query)
        all_cats = result.scalars().all()

        # Build tree
        cat_map = {}
        roots = []
        for cat in all_cats:
            schema = CategorySchema(
                category_id=cat.category_id,
                language_code=cat.language_code,
                category_type=cat.category_type,
                category_name=cat.category_name,
                parent_id=cat.parent_id,
                sort_order=cat.sort_order,
                children=[],
            )
            cat_map[cat.category_id] = schema

        for cat in all_cats:
            schema = cat_map[cat.category_id]
            if cat.parent_id and cat.parent_id in cat_map:
                cat_map[cat.parent_id].children.append(schema)
            else:
                roots.append(schema)

        return roots

    async def get_wordbooks(
        self,
        language_code: str,
        category_type: Optional[str] = None,
        category_id: Optional[int] = None,
        page: int = 1,
        size: int = 20,
    ) -> WordbookListResponse:
        """Get wordbook list with filtering and pagination."""
        conditions = [Wordbook.language_code == language_code]
        if category_id:
            conditions.append(Wordbook.category_id == category_id)

        # Count total
        count_query = select(func.count()).select_from(Wordbook).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Get page
        offset = (page - 1) * size
        query = (
            select(Wordbook)
            .where(and_(*conditions))
            .order_by(Wordbook.sort_order)
            .offset(offset)
            .limit(size)
        )
        result = await self.db.execute(query)
        wordbooks = result.scalars().all()

        return WordbookListResponse(
            total=total,
            wordbooks=[
                WordbookSchema(
                    book_id=wb.book_id,
                    language_code=wb.language_code,
                    category_type=wb.category.category_type if wb.category else None,
                    name=wb.name,
                    description=wb.description,
                    word_count=wb.word_count,
                    difficulty=wb.difficulty,
                    is_free=wb.is_free,
                    cover_color=wb.cover_color,
                    sort_order=wb.sort_order,
                )
                for wb in wordbooks
            ],
        )

    async def get_wordbook_detail(self, book_id: str) -> WordbookDetailResponse:
        """Get wordbook detail with word preview."""
        query = select(Wordbook).where(Wordbook.book_id == book_id)
        result = await self.db.execute(query)
        wb = result.scalar_one_or_none()

        if not wb:
            raise ValueError("词库不存在")

        # Get first 20 words preview
        words_query = (
            select(Word)
            .join(WordbookWord, WordbookWord.word_id == Word.word_id)
            .where(WordbookWord.book_id == book_id)
            .order_by(WordbookWord.sort_order)
            .limit(20)
        )
        words_result = await self.db.execute(words_query)
        words = words_result.scalars().all()

        return WordbookDetailResponse(
            book_id=wb.book_id,
            language_code=wb.language_code,
            category_type=wb.category.category_type if wb.category else None,
            name=wb.name,
            description=wb.description,
            word_count=wb.word_count,
            difficulty=wb.difficulty,
            is_free=wb.is_free,
            cover_color=wb.cover_color,
            sort_order=wb.sort_order,
            words_preview=[word_to_schema(w) for w in words],
        )

    async def get_wordbook_words(
        self, book_id: str, page: int = 1, size: int = 50
    ) -> WordListResponse:
        """Get words in a wordbook with pagination."""
        # Count total
        count_query = (
            select(func.count())
            .select_from(WordbookWord)
            .where(WordbookWord.book_id == book_id)
        )
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Get page
        offset = (page - 1) * size
        query = (
            select(Word)
            .join(WordbookWord, WordbookWord.word_id == Word.word_id)
            .where(WordbookWord.book_id == book_id)
            .order_by(WordbookWord.sort_order)
            .offset(offset)
            .limit(size)
        )
        result = await self.db.execute(query)
        words = result.scalars().all()

        return WordListResponse(
            total=total,
            words=[word_to_schema(w) for w in words],
        )

    async def get_word(self, word_id: str) -> WordSchema:
        """Get a single word by ID."""
        query = select(Word).where(Word.word_id == word_id)
        result = await self.db.execute(query)
        word = result.scalar_one_or_none()

        if not word:
            raise ValueError("单词不存在")

        return word_to_schema(word)

    async def search_words(
        self, q: str, language_code: str, limit: int = 20
    ) -> SearchResponse:
        """Search words by text."""
        query = (
            select(Word)
            .where(
                and_(
                    Word.language_code == language_code,
                    Word.word.ilike(f"%{q}%"),
                )
            )
            .order_by(Word.frequency_rank.asc().nullslast())
            .limit(limit)
        )
        result = await self.db.execute(query)
        words = result.scalars().all()

        return SearchResponse(results=[word_to_schema(w) for w in words])
