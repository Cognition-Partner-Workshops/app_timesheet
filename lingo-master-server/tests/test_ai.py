"""
AI services module tests.
Tests: LLM service, TTS service, AI cache, prompt generation.
"""
import pytest

from api.ai.llm_service import LLMService
from api.ai.tts_service import TTSService
from api.ai.cache import AICache
from api.ai.prompts import MEMORY_AID_PROMPT, ANALYSIS_PROMPT


class TestPrompts:
    """Test prompt template generation."""

    def test_memory_aid_prompt_has_placeholders(self):
        """Memory aid prompt should contain required placeholders."""
        assert "{word}" in MEMORY_AID_PROMPT
        assert "{language}" in MEMORY_AID_PROMPT
        assert "{meaning}" in MEMORY_AID_PROMPT

    def test_memory_aid_prompt_format(self):
        """Test formatting the memory aid prompt."""
        formatted = MEMORY_AID_PROMPT.format(
            word="abandon",
            language="英语",
            phonetic="/əˈbændən/",
            meaning="放弃，遗弃"
        )
        assert "abandon" in formatted
        assert "英语" in formatted
        assert "放弃" in formatted

    def test_analysis_prompt_has_placeholders(self):
        """Analysis prompt should contain required placeholders."""
        assert "{new_words_count}" in ANALYSIS_PROMPT
        assert "{review_count}" in ANALYSIS_PROMPT
        assert "{pass_rate}" in ANALYSIS_PROMPT


class TestLLMService:
    """Test LLM service wrapper."""

    def test_fallback_memory_aid(self):
        """Test fallback memory aid generation when LLM is unavailable."""
        service = LLMService()
        result = service._generate_fallback_memory_aid(
            word="abandon",
            language="en",
            phonetic="/əˈbændən/",
            meaning="放弃，遗弃"
        )
        assert result is not None
        assert "memory_tip" in result
        assert "morphology" in result

    def test_fallback_analysis_report(self):
        """Test fallback analysis report generation."""
        service = LLMService()
        user_stats = {
            "new_words_count": 50,
            "review_count": 200,
            "pass_rate": 85.0,
            "streak": 7,
        }
        result = service._generate_fallback_report(user_stats)
        assert result is not None
        assert "summary" in result
        assert "efficiency_score" in result
        assert "suggestions" in result

    def test_parse_json_valid(self):
        """Test JSON parsing with valid input."""
        service = LLMService()
        result = service._parse_json('{"key": "value", "number": 42}')
        assert result is not None
        assert result["key"] == "value"
        assert result["number"] == 42

    def test_parse_json_invalid(self):
        """Test JSON parsing with invalid input."""
        service = LLMService()
        result = service._parse_json("not valid json")
        assert "error" in result

    def test_parse_json_with_embedded_json(self):
        """Test JSON parsing with extra text around JSON."""
        service = LLMService()
        result = service._parse_json('Here is the result: {"key": "value"} done')
        assert result is not None
        assert result["key"] == "value"

    @pytest.mark.asyncio
    async def test_generate_memory_aid_fallback(self):
        """Test that memory aid generation falls back gracefully."""
        service = LLMService()
        result = await service.generate_memory_aid(
            word="abandon",
            language="en",
            phonetic="/əˈbændən/",
            meaning="放弃，遗弃"
        )
        assert result is not None
        # Should get fallback result since no LLM server is running

    @pytest.mark.asyncio
    async def test_generate_analysis_report_fallback(self):
        """Test that analysis report generation falls back gracefully."""
        service = LLMService()
        stats_data = {
            "new_words_count": 50,
            "review_count": 200,
            "avg_time_min": 25.0,
            "pass_rate": 85.0,
            "streak": 7,
            "weak_categories": "动词",
            "total_vocab": 500,
            "mastered_count": 200,
        }
        result = await service.generate_analysis_report(stats_data)
        assert result is not None
        assert "summary" in result


class TestTTSService:
    """Test TTS service wrapper."""

    def test_tts_service_initialization(self):
        """Test TTS service can be initialized."""
        service = TTSService()
        assert service is not None

    @pytest.mark.asyncio
    async def test_health_check_offline(self):
        """Test health check when TTS server is offline."""
        service = TTSService()
        result = await service.health_check()
        # Should return False when server is not running
        assert result is False

    @pytest.mark.asyncio
    async def test_get_languages_offline(self):
        """Test getting languages when server is offline."""
        service = TTSService()
        result = await service.get_languages()
        # Should return empty or fallback list when offline
        assert isinstance(result, (list, type(None)))


class TestAICache:
    """Test AI caching functionality."""

    @pytest.mark.asyncio
    async def test_cache_miss(self, db_session):
        """Test cache miss for new word."""
        cache = AICache(db_session)
        result = await cache.get_memory_aid("never_cached_word", "en")
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, seeded_db):
        """Test setting and getting cached memory aid."""
        db, user = seeded_db
        cache = AICache(db)
        test_data = {
            "harmonic": "test harmonic",
            "story": "test story",
            "memory_tip": "test tip",
        }
        # Use word_id from seeded data
        await cache.save_memory_aid("en_hello", "en", test_data)
        result = await cache.get_memory_aid("en_hello", "en")
        assert result is not None
        assert result["harmonic"] == "test harmonic"
