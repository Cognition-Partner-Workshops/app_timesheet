"""
Speech Recognition Module
Uses faster-whisper for high-speed, high-accuracy multilingual speech recognition.
Supports Japanese, English, and Chinese.
"""

import logging
import numpy as np
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# Language code mapping
LANGUAGE_MAP = {
    "japanese": "ja",
    "english": "en",
    "chinese": "zh",
    "auto": None,
}

LANGUAGE_NAMES = {
    "ja": "日本語",
    "en": "English",
    "zh": "中文",
}


class SpeechRecognizer:
    """Real-time speech recognition using faster-whisper."""

    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize the speech recognizer.

        Args:
            model_size: Whisper model size (tiny, base, small, medium, large-v3)
            device: Device to use (cpu or cuda)
            compute_type: Computation type (int8, float16, float32)
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load the Whisper model."""
        logger.info(
            "Loading Whisper model: %s (device=%s, compute=%s)",
            self.model_size,
            self.device,
            self.compute_type,
        )
        try:
            self.model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error("Failed to load Whisper model: %s", e)
            raise

    def transcribe(self, audio_data, language=None, sample_rate=16000):
        """
        Transcribe audio data to text.

        Args:
            audio_data: Raw audio bytes (16-bit PCM, mono)
            language: Language code ('ja', 'en', 'zh') or None for auto-detect
            sample_rate: Audio sample rate in Hz

        Returns:
            dict with keys: text, language, segments
        """
        if self.model is None:
            raise RuntimeError("Whisper model not loaded")

        try:
            # Convert bytes to numpy array (16-bit PCM -> float32)
            audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32)
            audio_np = audio_np / 32768.0  # Normalize to [-1.0, 1.0]

            if len(audio_np) == 0:
                return {"text": "", "language": "", "segments": []}

            # Check if audio is too quiet (likely silence)
            if np.max(np.abs(audio_np)) < 0.01:
                return {"text": "", "language": "", "segments": []}

            # Resolve language parameter
            lang = LANGUAGE_MAP.get(language, language)

            # Run transcription (optimized for low latency)
            segments, info = self.model.transcribe(
                audio_np,
                language=lang,
                beam_size=1,
                best_of=1,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=300,
                    speech_pad_ms=200,
                ),
            )

            # Collect results
            result_segments = []
            full_text = ""

            for segment in segments:
                result_segments.append(
                    {
                        "start": segment.start,
                        "end": segment.end,
                        "text": segment.text.strip(),
                    }
                )
                full_text += segment.text.strip() + " "

            detected_language = info.language if info.language else ""

            return {
                "text": full_text.strip(),
                "language": detected_language,
                "language_name": LANGUAGE_NAMES.get(detected_language, detected_language),
                "segments": result_segments,
                "language_probability": round(info.language_probability, 3)
                if info.language_probability
                else 0,
            }

        except Exception as e:
            logger.error("Transcription error: %s", e)
            return {"text": "", "language": "", "segments": [], "error": str(e)}

    def get_model_info(self):
        """Return information about the loaded model."""
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "loaded": self.model is not None,
        }
