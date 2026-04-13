"""
TTS service - wraps self-hosted MeloTTS service.
"""
import logging
from typing import Optional

import httpx

from api.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TTSService:
    """Self-hosted TTS service via MeloTTS."""

    def __init__(self):
        self.base_url = settings.TTS_BASE_URL
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(30.0),
            )
        return self._client

    async def synthesize(
        self,
        text: str,
        language: str,
        speed: float = 1.0,
        format: str = "mp3",
    ) -> bytes:
        """
        Synthesize speech from text using self-hosted TTS.
        Returns audio data as bytes.
        """
        client = await self._get_client()

        try:
            response = await client.post(
                "/api/v1/tts/synthesize",
                json={
                    "text": text,
                    "language": language,
                    "speed": speed,
                    "format": format,
                },
            )
            response.raise_for_status()
            return response.content

        except httpx.HTTPStatusError as e:
            logger.error(f"TTS service returned error: {e.response.status_code}")
            raise RuntimeError(f"TTS service error: {e.response.status_code}")
        except httpx.ConnectError:
            logger.error("Cannot connect to TTS service")
            raise RuntimeError("TTS服务暂不可用")

    async def get_languages(self) -> list:
        """Get supported languages from TTS service."""
        client = await self._get_client()
        try:
            response = await client.get("/api/v1/tts/languages")
            response.raise_for_status()
            data = response.json()
            return data.get("languages", [])
        except Exception:
            return []

    async def health_check(self) -> bool:
        """Check if TTS service is healthy."""
        client = await self._get_client()
        try:
            response = await client.get("/health")
            return response.status_code == 200
        except Exception:
            return False

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
