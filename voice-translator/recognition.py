"""
Speech Recognition Module
Supports multiple engines:
  - faster-whisper: High-accuracy multilingual batch recognition (Tiny/Base/Small/Medium)
  - sherpa-onnx SenseVoice: Ultra-fast multilingual recognition (zh/en/ja/ko/yue)
Supports Japanese, English, and Chinese.
"""

import logging
import os
import re
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
    "ko": "한국어",
    "yue": "粤语",
}

# SenseVoice language tag mapping (from model output to standard codes)
SENSEVOICE_LANG_MAP = {
    "<|zh|>": "zh",
    "<|en|>": "en",
    "<|ja|>": "ja",
    "<|ko|>": "ko",
    "<|yue|>": "yue",
}

# All available models across all engines
ALL_MODELS = [
    {"id": "sense-voice", "name": "SenseVoice (中英日韩粤)", "engine": "sensevoice",
     "description": "超高速AI识别 / Ultra-fast AI recognition"},
    {"id": "tiny", "name": "Whisper Tiny (39M)", "engine": "whisper",
     "description": "最快Whisper / Fastest Whisper"},
    {"id": "base", "name": "Whisper Base (140M)", "engine": "whisper",
     "description": "Whisper平衡 / Whisper Balanced"},
    {"id": "small", "name": "Whisper Small (244M)", "engine": "whisper",
     "description": "Whisper高精度 / Whisper High accuracy"},
    {"id": "medium", "name": "Whisper Medium (769M)", "engine": "whisper",
     "description": "Whisper最高精度 / Whisper Highest accuracy"},
]


class SpeechRecognizer:
    """Real-time speech recognition supporting multiple engines."""

    # Model-specific thresholds for Whisper
    MODEL_PARAMS = {
        "tiny": {"log_prob_threshold": -1.5, "avg_logprob_filter": -2.0, "no_speech_threshold": 0.5},
        "base": {"log_prob_threshold": -0.5, "avg_logprob_filter": -1.0, "no_speech_threshold": 0.3},
        "small": {"log_prob_threshold": -0.5, "avg_logprob_filter": -1.0, "no_speech_threshold": 0.3},
        "medium": {"log_prob_threshold": -0.5, "avg_logprob_filter": -1.0, "no_speech_threshold": 0.3},
    }

    # SenseVoice model directories to search (relative to this file), in priority order
    SENSEVOICE_MODEL_DIRS = [
        os.path.join(os.path.dirname(__file__), "models", d)
        for d in [
            "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17",
            "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-01-06",
            "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2025-09-09",
        ]
    ]
    # Also kept for backward compatibility
    SENSEVOICE_MODEL_DIR = os.path.join(
        os.path.dirname(__file__),
        "models",
        "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17",
    )

    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
        """
        Initialize the speech recognizer.

        Args:
            model_size: Model identifier (tiny, base, small, medium, sense-voice)
            device: Device to use (cpu or cuda)
            compute_type: Computation type for Whisper (int8, float16, float32)
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.engine = "sensevoice" if model_size == "sense-voice" else "whisper"
        self.whisper_model = None
        self.sensevoice_model = None
        self._sensevoice_format = None  # "onnx" or "ncnn"
        self._load_model()

    def _load_model(self):
        """Load the appropriate model based on engine type."""
        if self.engine == "sensevoice":
            self._load_sensevoice()
        else:
            self._load_whisper()

    def _load_whisper(self):
        """Load a Whisper model."""
        logger.info(
            "Loading Whisper model: %s (device=%s, compute=%s)",
            self.model_size, self.device, self.compute_type,
        )
        try:
            self.whisper_model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error("Failed to load Whisper model: %s", e)
            raise

    def _find_sensevoice_model(self):
        """Find the best available SenseVoice model (ONNX or ncnn).

        Searches known directories and scans the models/ folder for any
        directory whose name contains 'sense-voice'.  Prefers ONNX (int8
        then fp32) but falls back to ncnn automatically.

        Returns:
            tuple: (model_dir, model_format, model_files)
                model_format: "onnx" or "ncnn"
                model_files: dict with keys depending on format
                    onnx: {"model": path, "tokens": path}
                    ncnn: {"model_dir": path, "tokens": path}

        Raises:
            FileNotFoundError: if no valid model is found
        """
        models_root = os.path.join(os.path.dirname(__file__), "models")

        # Build search list: known dirs + any dir in models/ containing "sense-voice"
        search_dirs = list(self.SENSEVOICE_MODEL_DIRS)
        if os.path.isdir(models_root):
            for entry in sorted(os.listdir(models_root), reverse=True):
                full = os.path.join(models_root, entry)
                if os.path.isdir(full) and "sense-voice" in entry.lower():
                    if full not in search_dirs:
                        search_dirs.append(full)

        # 1) Search for ONNX model files (preferred)
        for d in search_dirs:
            for model_file in ("model.int8.onnx", "model.onnx"):
                candidate = os.path.join(d, model_file)
                tokens = os.path.join(d, "tokens.txt")
                if os.path.exists(candidate) and os.path.exists(tokens):
                    return d, "onnx", {"model": candidate, "tokens": tokens}

        # 2) Search for ncnn model files
        for d in search_dirs:
            ncnn_bin = os.path.join(d, "model.ncnn.bin")
            ncnn_param = os.path.join(d, "model.ncnn.param")
            tokens = os.path.join(d, "tokens.txt")
            if os.path.exists(ncnn_bin) and os.path.exists(ncnn_param) and os.path.exists(tokens):
                return d, "ncnn", {"model_dir": d, "tokens": tokens}

        raise FileNotFoundError(
            "SenseVoice model not found. Please download either:\n"
            "  ONNX: https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
            "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2\n"
            "  ncnn: https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/"
            "sherpa-ncnn-sense-voice-zh-en-ja-ko-yue-2025-09-09.tar.bz2\n"
            "and extract to voice-translator/models/"
        )

    def _load_sensevoice(self):
        """Load the SenseVoice model via sherpa-onnx (ONNX) or sherpa-ncnn (ncnn)."""
        model_dir, model_format, model_files = self._find_sensevoice_model()
        self._sensevoice_format = model_format

        logger.info("Loading SenseVoice model (%s format) from %s ...", model_format, model_dir)
        try:
            if model_format == "onnx":
                import sherpa_onnx
                self.sensevoice_model = sherpa_onnx.OfflineRecognizer.from_sense_voice(
                    model=model_files["model"],
                    tokens=model_files["tokens"],
                    num_threads=4,
                    sample_rate=16000,
                    language="auto",
                    use_itn=True,
                )
            else:
                import sherpa_ncnn
                config = sherpa_ncnn.OfflineRecognizerConfig()
                config.model_config.sense_voice.model_dir = model_files["model_dir"]
                config.model_config.sense_voice.language = "auto"
                config.model_config.sense_voice.use_itn = True
                config.model_config.tokens = model_files["tokens"]
                config.model_config.num_threads = 4
                config.model_config.debug = False
                self.sensevoice_model = sherpa_ncnn.OfflineRecognizer(config)

            self.SENSEVOICE_MODEL_DIR = model_dir
            logger.info("SenseVoice model loaded successfully (%s) from %s",
                        model_format, model_dir)
        except Exception as e:
            logger.error("Failed to load SenseVoice model: %s", e)
            raise

    def transcribe(self, audio_data, language=None, sample_rate=16000):
        """
        Transcribe audio data to text using the active engine.

        Args:
            audio_data: Raw audio bytes (16-bit PCM, mono)
            language: Language code ('ja', 'en', 'zh') or None for auto-detect
            sample_rate: Audio sample rate in Hz

        Returns:
            dict with keys: text, language, segments
        """
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
            "p95=%.6f, p99=%.6f, nonzero=%.1f%%, samples=%d, engine=%s",
            duration, rms, peak, p95, p99, nonzero_ratio * 100, len(audio_np),
            self.engine,
        )

        # Only skip pure digital silence (all zeros)
        if rms < 0.00001:
            logger.info("Skipping digital silence: rms=%.6f", rms)
            return {"text": "", "language": "", "segments": []}

        # Save debug WAV if enabled (set env DEBUG_AUDIO=1)
        if os.environ.get("DEBUG_AUDIO") == "1":
            self._save_debug_wav(audio_np, sample_rate, "pre_norm")

        # Normalize audio using hybrid RMS+peak approach
        target_rms = 0.1
        max_peak = 0.95
        if rms > 0.00001 and rms < target_rms:
            rms_gain = target_rms / rms
            peak_gain = max_peak / peak if peak > 0.0001 else rms_gain
            gain_factor = min(rms_gain, peak_gain)
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

        # Route to appropriate engine
        if self.engine == "sensevoice":
            return self._transcribe_sensevoice(audio_np, language, sample_rate)
        else:
            return self._transcribe_whisper(audio_np, language, sample_rate)

    def _transcribe_sensevoice(self, audio_np, language, sample_rate):
        """Transcribe using SenseVoice (sherpa-onnx or sherpa-ncnn). Ultra-fast."""
        if self.sensevoice_model is None:
            raise RuntimeError("SenseVoice model not loaded")

        try:
            t_start = time.time()
            logger.info("Starting SenseVoice transcribe (user_lang=%s)...", language or "auto")

            stream = self.sensevoice_model.create_stream()
            stream.accept_waveform(sample_rate, audio_np.tolist())
            self.sensevoice_model.decode_stream(stream)
            result = stream.result

            t_elapsed = time.time() - t_start

            text = result.text.strip() if result.text else ""
            # Parse language from SenseVoice output (e.g., "<|zh|>")
            auto_detected_lang = ""
            if hasattr(result, "lang") and result.lang:
                auto_detected_lang = SENSEVOICE_LANG_MAP.get(result.lang, result.lang.strip("<|>"))

            # If user explicitly selected a language (not auto), use it
            # SenseVoice auto-detection is unreliable for short utterances
            # (e.g., "嗯" detected as yue instead of ja/zh)
            if language and language != "auto":
                detected_lang = language
                if auto_detected_lang and auto_detected_lang != language:
                    logger.info(
                        "SenseVoice auto-detected '%s' but user selected '%s', using user selection",
                        auto_detected_lang, language,
                    )
            else:
                detected_lang = auto_detected_lang

            # Clean up SenseVoice output: remove language/emotion/event tags
            text = re.sub(r"<\|[^|]*\|>", "", text).strip()

            logger.info(
                "SenseVoice result: lang=%s (auto=%s, user=%s), text_len=%d, time=%.3fs, text='%s'",
                detected_lang, auto_detected_lang, language or "auto",
                len(text), t_elapsed, text[:200],
            )

            if not text:
                logger.info("No speech detected in this chunk (SenseVoice)")

            return {
                "text": text,
                "language": detected_lang or "zh",
                "language_name": LANGUAGE_NAMES.get(detected_lang, detected_lang),
                "segments": [{"start": 0, "end": len(audio_np) / sample_rate, "text": text}] if text else [],
                "language_probability": 0.95 if text else 0,
            }

        except Exception as e:
            logger.error("SenseVoice transcription error: %s", e)
            return {"text": "", "language": "", "segments": [], "error": str(e)}

    def _transcribe_whisper(self, audio_np, language, sample_rate):
        """Transcribe using faster-whisper."""
        if self.whisper_model is None:
            raise RuntimeError("Whisper model not loaded")

        try:
            # Resolve language parameter
            lang = LANGUAGE_MAP.get(language, language)

            # Use model-specific parameters
            params = self.MODEL_PARAMS.get(self.model_size, self.MODEL_PARAMS["base"])
            t_start = time.time()
            logger.info("Starting Whisper transcribe (lang=%s, model=%s, log_prob=%.1f, no_speech=%.1f)...",
                        lang, self.model_size, params["log_prob_threshold"], params["no_speech_threshold"])
            segments, info = self.whisper_model.transcribe(
                audio_np,
                language=lang,
                beam_size=1,
                best_of=1,
                vad_filter=False,
                condition_on_previous_text=False,
                no_speech_threshold=params["no_speech_threshold"],
                log_prob_threshold=params["log_prob_threshold"],
                compression_ratio_threshold=2.4,
            )
            logger.info(
                "Whisper transcribe returned (lang=%s, prob=%.2f), iterating segments...",
                info.language if info.language else "?",
                info.language_probability if info.language_probability else 0,
            )

            # Collect results with safety limit and timeout
            result_segments = []
            full_text = ""
            max_segments = 20
            segment_timeout = 15.0
            segment_start_time = time.time()

            for segment in segments:
                if time.time() - segment_start_time > segment_timeout:
                    logger.warning(
                        "Segment iteration timeout (%.1fs), stopping after %d segments",
                        segment_timeout, len(result_segments),
                    )
                    break
                if len(result_segments) >= max_segments:
                    logger.warning("Reached max segments limit (%d), stopping", max_segments)
                    break
                text = segment.text.strip()
                if not text:
                    continue
                logger.info(
                    "  Segment [%.1f-%.1f]: no_speech=%.3f, avg_logprob=%.3f, "
                    "compression_ratio=%.2f, text='%s'",
                    segment.start, segment.end,
                    segment.no_speech_prob, segment.avg_logprob,
                    getattr(segment, 'compression_ratio', 0),
                    text[:100],
                )
                # Post-processing hallucination filter
                avg_logprob_threshold = params["avg_logprob_filter"]
                if segment.avg_logprob < avg_logprob_threshold:
                    logger.info(
                        "  -> FILTERED (avg_logprob=%.3f < %.1f, likely hallucination)",
                        segment.avg_logprob, avg_logprob_threshold,
                    )
                    continue
                result_segments.append(
                    {
                        "start": segment.start,
                        "end": segment.end,
                        "text": text,
                        "no_speech_prob": segment.no_speech_prob,
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

    def change_model(self, model_size):
        """Change the recognition model.

        Args:
            model_size: New model identifier (tiny, base, small, medium, sense-voice)

        Returns:
            dict with model info after change
        """
        new_engine = "sensevoice" if model_size == "sense-voice" else "whisper"

        if model_size == self.model_size and (
            (self.engine == "whisper" and self.whisper_model is not None) or
            (self.engine == "sensevoice" and self.sensevoice_model is not None)
        ):
            logger.info("Model %s already loaded, skipping", model_size)
            return self.get_model_info()

        logger.info("Changing model from %s (%s) to %s (%s)",
                     self.model_size, self.engine, model_size, new_engine)

        # Save previous state for rollback on failure
        prev_model_size = self.model_size
        prev_engine = self.engine
        prev_whisper = self.whisper_model
        prev_sensevoice = self.sensevoice_model

        self.model_size = model_size
        self.engine = new_engine

        # Free old models
        self.whisper_model = None
        self.sensevoice_model = None

        try:
            self._load_model()
        except Exception:
            # Rollback to previous working model
            logger.warning("Failed to load %s, rolling back to %s", model_size, prev_model_size)
            self.model_size = prev_model_size
            self.engine = prev_engine
            self.whisper_model = prev_whisper
            self.sensevoice_model = prev_sensevoice
            raise

        return self.get_model_info()

    def get_model_info(self):
        """Return information about the loaded model."""
        sensevoice_available = False
        sensevoice_format = None
        sensevoice_status = "未安装 / Not installed"
        try:
            _, fmt, _ = self._find_sensevoice_model()
            sensevoice_available = True
            sensevoice_format = fmt
        except FileNotFoundError:
            sensevoice_status = "未安装 / Not installed"

        models = []
        for m in ALL_MODELS:
            model_entry = dict(m)
            if m["id"] == "sense-voice" and not sensevoice_available:
                model_entry["description"] = sensevoice_status
                model_entry["disabled"] = True
            models.append(model_entry)

        return {
            "model_size": self.model_size,
            "engine": self.engine,
            "device": self.device,
            "compute_type": self.compute_type,
            "loaded": (self.whisper_model is not None) or (self.sensevoice_model is not None),
            "available_models": models,
        }
