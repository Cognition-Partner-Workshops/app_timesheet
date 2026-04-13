"""
Redis client utility.
"""
import logging
from typing import Optional

from api.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client = None


async def get_redis():
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        except ImportError:
            logger.warning("redis package not available")
            return None
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            return None
    return _redis_client


async def cache_set(key: str, value: str, expire: int = 3600) -> bool:
    """Set a value in Redis cache."""
    client = await get_redis()
    if client:
        try:
            await client.set(key, value, ex=expire)
            return True
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    return False


async def cache_get(key: str) -> Optional[str]:
    """Get a value from Redis cache."""
    client = await get_redis()
    if client:
        try:
            return await client.get(key)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
    return None


async def cache_delete(key: str) -> bool:
    """Delete a value from Redis cache."""
    client = await get_redis()
    if client:
        try:
            await client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
    return False


async def close_redis():
    """Close Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
