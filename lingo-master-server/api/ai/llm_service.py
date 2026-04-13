"""
LLM service - wraps self-hosted vLLM with OpenAI-compatible API.
"""
import json
import logging
from typing import Optional, Dict, Any

from api.config import get_settings
from api.ai.prompts import MEMORY_AID_PROMPT, ANALYSIS_PROMPT
from api.ai.cache import AICache

logger = logging.getLogger(__name__)
settings = get_settings()


class LLMService:
    """Self-hosted LLM service via vLLM OpenAI-compatible API."""

    def __init__(self, cache: Optional[AICache] = None):
        self.base_url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL_NAME
        self.cache = cache
        self._client = None

    async def _get_client(self):
        """Lazy initialization of OpenAI async client."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(
                    base_url=self.base_url,
                    api_key="not-needed",
                )
            except ImportError:
                logger.warning("openai package not available, LLM service disabled")
                return None
        return self._client

    async def generate_memory_aid(
        self, word: str, language: str, phonetic: str, meaning: str
    ) -> Dict[str, Any]:
        """Generate AI memory aid for a word."""
        # Check cache first
        if self.cache:
            cached = await self.cache.get_memory_aid(word, language)
            if cached:
                cached["cached"] = True
                return cached

        # Try LLM
        client = await self._get_client()
        if not client:
            return self._generate_fallback_memory_aid(word, language, phonetic, meaning)

        prompt = MEMORY_AID_PROMPT.format(
            language=language,
            word=word,
            phonetic=phonetic,
            meaning=meaning,
        )

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是专业的外语记忆辅助助手。严格按JSON格式输出。"},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=500,
                temperature=0.7,
            )

            result_text = response.choices[0].message.content.strip()
            result = self._parse_json(result_text)

            # Cache result
            if self.cache and "error" not in result:
                await self.cache.save_memory_aid(word, language, result)

            result["cached"] = False
            return result

        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return self._generate_fallback_memory_aid(word, language, phonetic, meaning)

    async def generate_analysis_report(self, user_stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI learning analysis report."""
        client = await self._get_client()
        if not client:
            return self._generate_fallback_report(user_stats)

        prompt = ANALYSIS_PROMPT.format(**user_stats)

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是学习分析专家。严格按JSON格式输出分析报告。"},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=800,
                temperature=0.5,
            )

            result_text = response.choices[0].message.content.strip()
            return self._parse_json(result_text)

        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            return self._generate_fallback_report(user_stats)

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM output, handling common formatting issues."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
            return {"error": "Failed to parse LLM output", "raw": text}

    def _generate_fallback_memory_aid(
        self, word: str, language: str, phonetic: str, meaning: str
    ) -> Dict[str, Any]:
        """Generate a basic fallback memory aid when LLM is unavailable."""
        return {
            "harmonic": None,
            "morphology": {
                "prefix": None,
                "root": word,
                "suffix": None,
                "explanation": f"基础词形: {word}",
            },
            "story": None,
            "related_words": [],
            "common_phrases": [],
            "memory_tip": f"反复朗读 {word} 并联想其含义: {meaning}",
            "cached": False,
            "fallback": True,
        }

    def _generate_fallback_report(self, user_stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a basic fallback report when LLM is unavailable."""
        new_words = user_stats.get("new_words_count", 0)
        pass_rate = user_stats.get("pass_rate", 0)

        return {
            "summary": f"本周学习了{new_words}个新词，复习通过率{pass_rate}%，继续加油！",
            "efficiency_score": min(100, int(pass_rate * 0.8 + 20)),
            "strengths": ["坚持学习习惯"],
            "weaknesses": ["需要增加复习频率"],
            "suggestions": [
                "建议每天至少复习20分钟",
                "重点关注容易遗忘的单词",
                "尝试使用记忆辅助功能",
            ],
            "next_week_focus": "巩固已学词汇，适当增加新词量",
            "fallback": True,
        }
