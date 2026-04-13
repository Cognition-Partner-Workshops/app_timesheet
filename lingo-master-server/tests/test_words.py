"""
Words and wordbook module tests.
Tests: languages, categories, wordbooks, words, search.
"""
import pytest
from api.words.service import WordService


class TestWordService:
    """Test word/wordbook service methods."""

    @pytest.mark.asyncio
    async def test_get_languages(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        languages = await service.get_languages()
        assert len(languages) >= 3
        # Check sorted by sort_order - LanguageSchema uses 'code' not 'language_code'
        assert languages[0].code == "en"
        assert languages[1].code == "ja"

    @pytest.mark.asyncio
    async def test_get_categories(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        categories = await service.get_categories("en")
        assert len(categories) >= 2

    @pytest.mark.asyncio
    async def test_get_wordbooks(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        result = await service.get_wordbooks(language_code="en")
        assert result.total >= 1
        books = result.wordbooks
        assert len(books) >= 1
        assert books[0].book_id == "en_test"

    @pytest.mark.asyncio
    async def test_get_wordbook_detail(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        detail = await service.get_wordbook_detail("en_test")
        assert detail is not None
        assert detail.book_id == "en_test"
        assert detail.name == "测试词库"

    @pytest.mark.asyncio
    async def test_get_wordbook_words(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        result = await service.get_wordbook_words("en_test", page=1, size=10)
        assert result.total == 5
        assert len(result.words) == 5

    @pytest.mark.asyncio
    async def test_get_wordbook_words_pagination(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        result = await service.get_wordbook_words("en_test", page=1, size=2)
        assert result.total == 5
        assert len(result.words) == 2

    @pytest.mark.asyncio
    async def test_get_single_word(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        word = await service.get_word("en_hello")
        assert word is not None
        assert word.word == "hello"
        assert word.language_code == "en"

    @pytest.mark.asyncio
    async def test_get_nonexistent_word(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        with pytest.raises(ValueError):
            await service.get_word("nonexistent_word")

    @pytest.mark.asyncio
    async def test_search_words(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        results = await service.search_words("hello", language_code="en")
        assert len(results.results) >= 1
        assert any(w.word == "hello" for w in results.results)

    @pytest.mark.asyncio
    async def test_search_words_no_results(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        results = await service.search_words("xyznonsense123", language_code="en")
        assert len(results.results) == 0

    @pytest.mark.asyncio
    async def test_search_words_partial_match(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        results = await service.search_words("hel", language_code="en")
        assert len(results.results) >= 1

    @pytest.mark.asyncio
    async def test_word_has_meanings(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        word = await service.get_word("en_hello")
        assert word is not None
        assert len(word.meanings) > 0
        # Check meaning structure - meanings are WordMeaningSchema objects
        meaning = word.meanings[0]
        assert meaning.pos is not None
        assert meaning.definition_zh is not None

    @pytest.mark.asyncio
    async def test_wordbook_not_found(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        with pytest.raises(ValueError):
            await service.get_wordbook_detail("nonexistent_book")

    @pytest.mark.asyncio
    async def test_categories_empty_for_unknown_language(self, seeded_db):
        db, _ = seeded_db
        service = WordService(db)
        categories = await service.get_categories("xx")
        assert len(categories) == 0
