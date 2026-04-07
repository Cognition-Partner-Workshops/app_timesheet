"""
Text-to-Speech Module
Uses edge-tts for high-quality multilingual speech synthesis.
Supports Chinese, English, and Japanese voices.
"""

import asyncio
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor

import edge_tts

logger = logging.getLogger(__name__)

# Voice mapping for each language
VOICE_MAP = {
    "zh": "zh-CN-XiaoxiaoNeural",
    "en": "en-US-JennyNeural",
    "ja": "ja-JP-NanamiNeural",
}

# Alternative voices
VOICE_OPTIONS = {
    "zh": [
        {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓 (女声)", "gender": "Female"},
        {"id": "zh-CN-YunxiNeural", "name": "云希 (男声)", "gender": "Male"},
        {"id": "zh-CN-YunjianNeural", "name": "云健 (男声)", "gender": "Male"},
    ],
    "en": [
        {"id": "en-US-JennyNeural", "name": "Jenny (Female)", "gender": "Female"},
        {"id": "en-US-GuyNeural", "name": "Guy (Male)", "gender": "Male"},
        {"id": "en-US-AriaNeural", "name": "Aria (Female)", "gender": "Female"},
    ],
    "ja": [
        {"id": "ja-JP-NanamiNeural", "name": "七海 (女声)", "gender": "Female"},
        {"id": "ja-JP-KeitaNeural", "name": "圭太 (男声)", "gender": "Male"},
    ],
}


class TTSEngine:
    """Text-to-Speech engine using edge-tts."""

    def __init__(self, audio_dir="static/audio", max_workers=2):
        """
        Initialize TTS engine.

        Args:
            audio_dir: Directory to store generated audio files
            max_workers: Maximum concurrent TTS tasks
        """
        self.audio_dir = audio_dir
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.custom_voices = {}
        os.makedirs(audio_dir, exist_ok=True)
        logger.info("TTS Engine initialized, audio_dir=%s", audio_dir)

    async def _synthesize(self, text, voice, output_path):
        """Async synthesis using edge-tts."""
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)

    def synthesize(self, text, language="zh", voice=None):
        """
        Synthesize text to speech.

        Args:
            text: Text to convert to speech
            language: Language code ('zh', 'en', 'ja')
            voice: Specific voice ID (optional, uses default for language)

        Returns:
            dict with keys: audio_path, audio_url, language
        """
        if not text or not text.strip():
            return {"audio_path": None, "audio_url": None, "language": language}

        try:
            # Select voice
            selected_voice = voice or self.custom_voices.get(
                language, VOICE_MAP.get(language, VOICE_MAP["zh"])
            )

            # Generate unique filename
            filename = f"tts_{uuid.uuid4().hex[:12]}.mp3"
            output_path = os.path.join(self.audio_dir, filename)

            # Run async synthesis in a new event loop
            loop = asyncio.new_event_loop()
            try:
                loop.run_until_complete(
                    self._synthesize(text, selected_voice, output_path)
                )
            finally:
                loop.close()

            audio_url = f"/static/audio/{filename}"
            logger.info("TTS generated: %s (%s)", filename, language)

            return {
                "audio_path": output_path,
                "audio_url": audio_url,
                "language": language,
                "voice": selected_voice,
            }

        except Exception as e:
            logger.error("TTS error: %s", e)
            return {
                "audio_path": None,
                "audio_url": None,
                "language": language,
                "error": str(e),
            }

    def synthesize_async(self, text, language="zh", voice=None, callback=None):
        """
        Synthesize text to speech asynchronously (non-blocking).

        Args:
            text: Text to convert
            language: Language code
            voice: Specific voice ID
            callback: Function to call with result

        Returns:
            Future object
        """
        future = self.executor.submit(self.synthesize, text, language, voice)
        if callback:
            future.add_done_callback(lambda f: callback(f.result()))
        return future

    def set_voice(self, language, voice_id):
        """
        Set a custom voice for a language.

        Args:
            language: Language code
            voice_id: Voice ID to use
        """
        self.custom_voices[language] = voice_id
        logger.info("Voice set for %s: %s", language, voice_id)

    def get_voice_options(self):
        """Return available voice options for each language."""
        return VOICE_OPTIONS

    def cleanup_old_files(self, max_files=100):
        """Remove old audio files to free disk space."""
        try:
            files = sorted(
                [
                    os.path.join(self.audio_dir, f)
                    for f in os.listdir(self.audio_dir)
                    if f.endswith(".mp3")
                ],
                key=os.path.getctime,
            )
            if len(files) > max_files:
                for f in files[: len(files) - max_files]:
                    os.remove(f)
                logger.info("Cleaned up %d old audio files", len(files) - max_files)
        except Exception as e:
            logger.error("Cleanup error: %s", e)

    def shutdown(self):
        """Shutdown the TTS thread pool."""
        self.executor.shutdown(wait=False)
        logger.info("TTS Engine shutdown")
