"""
AI result caching service.
"""
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database.models import AIMemoryCache


class AICache:
    """Cache for AI-generated content."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_memory_aid(self, word_id: str, language_code: str) -> Optional[Dict[str, Any]]:
        """Get cached memory aid for a word."""
        query = select(AIMemoryCache).where(AIMemoryCache.word_id == word_id)
        result = await self.db.execute(query)
        cache = result.scalar_one_or_none()

        if cache:
            return cache.memory_aids
        return None

    async def save_memory_aid(
        self, word_id: str, language_code: str, memory_aids: Dict[str, Any]
    ) -> None:
        """Save memory aid to cache."""
        # Check if exists
        query = select(AIMemoryCache).where(AIMemoryCache.word_id == word_id)
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            existing.memory_aids = memory_aids
        else:
            cache = AIMemoryCache(
                word_id=word_id,
                language_code=language_code,
                memory_aids=memory_aids,
            )
            self.db.add(cache)

        await self.db.flush()
