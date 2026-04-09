"""
Speech Recognition Module
Uses faster-whisper for high-speed, high-accuracy multilingual speech recognition.
Supports Japanese, English, and Chinese.
"""

import logging
import os
import time
import wave

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

            # Compute audio stats for logging
            rms = float(np.sqrt(np.mean(audio_np ** 2)))
            peak = float(np.max(np.abs(audio_np)))
            duration = len(audio_np) / sample_rate

            # Compute percentile stats for better diagnostics
            abs_audio = np.abs(audio_np)
            p95 = float(np.percentile(abs_audio, 95))
            p99 = float(np.percentile(abs_audio, 99))
            nonzero_ratio = float(np.count_nonzero(audio_np) / len(audio_np))
            logger.info(
                "Transcribe input: duration=%.2fs, rms=%.6f, peak=%.6f, "
                "p95=%.6f, p99=%.6f, nonzero=%.1f%%, samples=%d",
                duration, rms, peak, p95, p99, nonzero_ratio * 100, len(audio_np),
            )

            # Only skip pure digital silence (all zeros)
            if rms < 0.00001:
                logger.info("Skipping digital silence: rms=%.6f", rms)
                return {"text": "", "language": "", "segments": []}

            # Save debug WAV if enabled (set env DEBUG_AUDIO=1)
            if os.environ.get("DEBUG_AUDIO") == "1":
                self._save_debug_wav(audio_np, sample_rate, "pre_norm")

            # Normalize audio using hybrid RMS+peak approach
            # Pure RMS normalization can cause clipping when crest factor is high
            # (e.g., rms=0.002, peak=0.027 → gain=50x → peak=1.35 → clipped)
            # Hybrid: target rms=0.1 but cap gain so peak stays under 0.95
            target_rms = 0.1  # Standard speech RMS level
            max_peak = 0.95  # Prevent clipping distortion
            if rms > 0.00001 and rms < target_rms:
                rms_gain = target_rms / rms
                peak_gain = max_peak / peak if peak > 0.0001 else rms_gain
                # Use the smaller gain to avoid clipping
                gain_factor = min(rms_gain, peak_gain)
                # Cap gain to avoid amplifying pure noise too much
                gain_factor = min(gain_factor, 200.0)
                audio_np = audio_np * gain_factor
                new_rms = float(np.sqrt(np.mean(audio_np ** 2)))
                new_peak = float(np.max(np.abs(audio_np)))
                logger.info(
                    "Audio normalized: gain=%.1fx (rms_gain=%.1f, peak_gain=%.1f), "
                    "rms: %.6f->%.6f, peak: %.6f->%.6f",
                    gain_factor, rms_gain, peak_gain,
                    rms, new_rms, peak, new_peak,
                )

            # Save debug WAV after normalization if enabled
            if os.environ.get("DEBUG_AUDIO") == "1":
                self._save_debug_wav(audio_np, sample_rate, "post_norm")

            # Resolve language parameter
            lang = LANGUAGE_MAP.get(language, language)

            # Run transcription with VAD DISABLED
            # Whisper's Silero VAD is too aggressive for weak signals even after normalization.
            # We handle silence filtering ourselves (rms check above + app.py filtering).
            # Without VAD, Whisper processes all audio directly - the no_speech_threshold
            # parameter prevents hallucination on silent segments.
            t_start = time.time()
            segments, info = self.model.transcribe(
                audio_np,
                language=lang,
                beam_size=1,
                best_of=1,
                vad_filter=False,  # Disabled: Silero VAD rejects weak Stereo Mix signals
                condition_on_previous_text=False,  # Prevent hallucination loops
                no_speech_threshold=0.3,  # Lower threshold to catch more non-speech
                log_prob_threshold=-0.5,  # Skip low-confidence segments
                compression_ratio_threshold=2.4,  # Filter repetitive hallucinations
            )

            # Collect results with safety limit to prevent infinite hallucination
            result_segments = []
            full_text = ""
            max_segments = 20  # Safety limit

            for segment in segments:
                if len(result_segments) >= max_segments:
                    logger.warning("Reached max segments limit (%d), stopping", max_segments)
                    break
                text = segment.text.strip()
                if not text:
                    continue
                # Log each segment with confidence details
                logger.info(
                    "  Segment [%.1f-%.1f]: no_speech=%.3f, avg_logprob=%.3f, "
                    "compression_ratio=%.2f, text='%s'",
                    segment.start, segment.end,
                    segment.no_speech_prob, segment.avg_logprob,
                    getattr(segment, 'compression_ratio', 0),
                    text[:100],
                )
                # Post-processing hallucination filter:
                # Segments with very low avg_logprob are almost certainly noise/hallucination
                # User logs showed "Pfft" (logprob=-1.494) and "アータッ" (logprob=-1.672)
                if segment.avg_logprob < -1.0:
                    logger.info(
                        "  -> FILTERED (avg_logprob=%.3f < -1.0, likely hallucination)",
                        segment.avg_logprob,
                    )
                    continue
                result_segments.append(
                    {
                        "start": segment.start,
                        "end": segment.end,
                        "text": text,
                    }
                )
                full_text += text + " "

            t_elapsed = time.time() - t_start
            detected_language = info.language if info.language else ""
            lang_prob = info.language_probability if info.language_probability else 0
            logger.info(
                "Transcribe result: lang=%s (prob=%.2f), text_len=%d, segments=%d, "
                "time=%.2fs, no_speech_prob=%.3f",
                detected_language, lang_prob,
                len(full_text), len(result_segments),
                t_elapsed,
                # Log first segment's no_speech_prob as overall indicator
                result_segments[0].get("no_speech_prob", 0) if result_segments else 0,
            )
            if full_text.strip():
                logger.info("Transcribed text: %s", full_text.strip()[:200])
            else:
                logger.info("No speech detected in this chunk")

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

    def _save_debug_wav(self, audio_np, sample_rate, label):
        """Save audio to a WAV file for debugging."""
        try:
            debug_dir = os.path.join(os.path.dirname(__file__), "debug_audio")
            os.makedirs(debug_dir, exist_ok=True)
            timestamp = time.strftime("%H%M%S")
            filepath = os.path.join(debug_dir, f"{timestamp}_{label}.wav")
            # Convert float32 to int16
            audio_int16 = (audio_np * 32767).astype(np.int16)
            with wave.open(filepath, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                wf.writeframes(audio_int16.tobytes())
            logger.info("Debug WAV saved: %s", filepath)
        except Exception as e:
            logger.warning("Failed to save debug WAV: %s", e)

    def get_model_info(self):
        """Return information about the loaded model."""
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "loaded": self.model is not None,
        }
