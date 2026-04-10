"""
Voice Translator - Main Application
Real-time multilingual speech recognition and translation system.
Supports Japanese, English, and Chinese.
"""

import logging
import os
import threading

import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory, Response
from flask_socketio import SocketIO, emit

from recognition import SpeechRecognizer
from translation import TranslationManager
from tts_module import TTSEngine
from speaker_diarization import SpeakerDiarizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24).hex()

# Initialize SocketIO (threading mode for native thread compatibility)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    max_http_buffer_size=10 * 1024 * 1024,  # 10MB max for audio data
)

# Initialize modules
logger.info("Initializing speech recognizer...")
recognizer = SpeechRecognizer(model_size="base", device="cpu", compute_type="int8")

logger.info("Initializing translation manager...")
translator = TranslationManager(max_workers=4)

logger.info("Initializing speaker diarizer...")
diarizer = SpeakerDiarizer(similarity_threshold=0.75)

logger.info("Initializing TTS engine...")
tts_engine = TTSEngine(
    audio_dir=os.path.join(os.path.dirname(__file__), "static", "audio"),
    max_workers=2,
)

logger.info("All modules initialized successfully!")

# Lock for thread-safe access to recognizer (final requests + model changes)
recognizer_lock = threading.Lock()
# Separate semaphore for interim requests — allows 1 concurrent interim
# that does NOT compete with recognizer_lock. CTranslate2 is thread-safe
# for inference, so interim and final can run simultaneously.
_interim_sem = threading.Semaphore(1)


# ==================== HTTP Routes ====================


@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/api/languages")
def get_languages():
    """Get supported languages and translation engines."""
    return jsonify(
        {
            "recognition": [
                {"code": "auto", "label": "自动検出 / Auto Detect"},
                {"code": "ja", "label": "日本語"},
                {"code": "en", "label": "English"},
                {"code": "zh", "label": "中文"},
            ],
            "translation": translator.get_supported_languages(),
            "tts_voices": tts_engine.get_voice_options(),
            "translation_engines": translator.get_available_engines(),
        }
    )


@app.route("/api/init-ai-translator", methods=["POST"])
def init_ai_translator():
    """Initialize the AI translator (lazy loading)."""
    translator.init_ai_translator(max_workers=2)
    return jsonify({
        "engines": translator.get_available_engines(),
    })


@app.route("/api/model-info")
def get_model_info():
    """Get speech recognition model information."""
    return jsonify(recognizer.get_model_info())


@app.route("/api/change-model", methods=["POST"])
def change_model():
    """Change the speech recognition model."""
    data = request.get_json()
    model_size = data.get("model_size", "base")
    valid_models = ["tiny", "base", "small", "medium", "sense-voice"]
    if model_size not in valid_models:
        return jsonify({"error": f"Invalid model: {model_size}"}), 400

    logger.info("Changing recognition model to: %s", model_size)
    with recognizer_lock:
        result = recognizer.change_model(model_size)
    return jsonify(result)


@app.route("/api/summarize", methods=["POST"])
def summarize():
    """Summarize all recognized text."""
    data = request.get_json()
    texts = data.get("texts", [])
    languages = data.get("languages", [])  # Detected language per text
    target_lang = data.get("target_lang", "zh")
    translation_mode = data.get("translation_mode", "google")

    if not texts:
        return jsonify({"error": "No text to summarize"}), 400

    # Combine all recognized texts
    combined = "\n".join(texts)
    logger.info("Summarizing %d texts (%d chars) to %s", len(texts), len(combined), target_lang)

    # Build structured summary
    summary_lines = []
    summary_lines.append("=" * 50)
    summary_lines.append("Session Summary / \u4f1a\u8bae\u603b\u7ed3")
    summary_lines.append("=" * 50)
    summary_lines.append("")
    summary_lines.append(f"Total sentences: {len(texts)}")
    summary_lines.append(f"Total characters: {len(combined)}")
    summary_lines.append("")
    summary_lines.append("-" * 50)
    summary_lines.append("Original Text / \u539f\u6587:")
    summary_lines.append("-" * 50)
    for i, text in enumerate(texts, 1):
        summary_lines.append(f"{i}. {text}")
    summary_lines.append("")

    # Translate combined text to target language
    summary_lines.append("-" * 50)
    summary_lines.append(f"Translation ({target_lang}) / \u7ffb\u8bd1:")
    summary_lines.append("-" * 50)
    for i, text in enumerate(texts, 1):
        # Use the detected language from recognition if available,
        # otherwise fall back to "auto" (which only works with Google Translate)
        source_lang = languages[i - 1] if i - 1 < len(languages) and languages[i - 1] != "auto" else "auto"
        trans_result = translator.translate(
            text, source_lang=source_lang, target_lang=target_lang, mode=translation_mode
        )
        translated = trans_result.get("translated", text)
        source_lang_detected = trans_result.get("source_lang", source_lang)
        summary_lines.append(f"{i}. [{source_lang_detected}] {text}")
        summary_lines.append(f"   -> [{target_lang}] {translated}")

    summary_lines.append("")
    summary_lines.append("=" * 50)

    return jsonify({
        "summary": "\n".join(summary_lines),
        "total_sentences": len(texts),
        "total_characters": len(combined),
        "target_lang": target_lang,
    })


@app.route("/static/audio/<path:filename>")
def serve_audio(filename):
    """Serve generated TTS audio files."""
    audio_dir = os.path.join(os.path.dirname(__file__), "static", "audio")
    return send_from_directory(audio_dir, filename)


# ==================== WebSocket Events ====================


@socketio.on("connect")
def handle_connect():
    """Handle client connection."""
    logger.info("Client connected: %s", request.sid)
    emit("status", {"message": "已连接服务器 / Connected", "type": "success"})


@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection."""
    logger.info("Client disconnected: %s", request.sid)


@socketio.on("audio_data")
def handle_audio_data(data):
    """
    Handle incoming audio data for recognition.

    Expected data format:
    {
        "audio": bytes,          # Raw PCM audio data (16-bit, mono, 16kHz)
        "language": "auto",      # Recognition language
        "target_lang": "zh",     # Translation target language
        "enable_tts": true,      # Whether to generate TTS
        "tts_voice": null,       # Custom TTS voice (optional)
        "translation_mode": "google",  # Translation engine
        "enable_diarization": true,    # Speaker diarization toggle
        "interim": false               # If true, skip translation/diarization for speed
    }
    """
    try:
        audio_bytes = data.get("audio")
        language = data.get("language", "auto")
        target_lang = data.get("target_lang", "zh")
        enable_tts = data.get("enable_tts", True)
        tts_voice = data.get("tts_voice")
        translation_mode = data.get("translation_mode", "google")
        enable_diarization = data.get("enable_diarization", True)
        is_interim = data.get("interim", False)
        silence_interval = data.get("silence_interval", 0.5)

        if not audio_bytes:
            logger.warning("No audio bytes received")
            return

        # Compute audio stats for logging and silence detection
        audio_np_quick = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        rms_energy = float(np.sqrt(np.mean(audio_np_quick ** 2)))
        peak_energy = float(np.max(np.abs(audio_np_quick)))
        duration_sec = len(audio_np_quick) / 16000.0
        logger.info(
            "Received audio: %d bytes, duration=%.2fs, rms=%.6f, peak=%.6f, lang=%s, target=%s, mode=%s, interim=%s",
            len(audio_bytes), duration_sec, rms_energy, peak_energy, language, target_lang, translation_mode, is_interim,
        )
        # Only skip pure digital silence (all zeros or near-zero)
        # Real silence filtering is handled by Whisper's VAD + safety params
        if rms_energy < 0.00001:
            logger.info("Skipping digital silence (rms=%.6f)", rms_energy)
            return

        # Capture sid while still in request context
        sid = request.sid

        # Step 1: Speaker diarization (skip for interim requests - speed)
        speaker_info = None
        if enable_diarization and not is_interim:
            try:
                logger.info("Starting speaker diarization...")
                speaker_info = diarizer.identify_speaker(audio_bytes)
                logger.info("Speaker diarization done: %s", speaker_info.get("speaker_id", "?") if speaker_info else "None")
            except Exception as e:
                logger.warning("Speaker diarization error: %s", e)

        # Step 2: Speech Recognition
        lang_param = None if language == "auto" else language
        if is_interim:
            # Interim uses a separate semaphore (not recognizer_lock) so it
            # can run concurrently with final requests. CTranslate2 is thread-safe
            # for inference. Only 1 interim at a time (semaphore=1) to limit CPU load.
            acquired = _interim_sem.acquire(blocking=False)
            if not acquired:
                logger.info("Interim already processing, skipping")
                return
            try:
                logger.info("Processing interim (concurrent, no main lock)...")
                result = recognizer.transcribe(audio_bytes, language=lang_param)
            finally:
                _interim_sem.release()
        else:
            # Final: blocking lock to serialize final results and prevent
            # concurrent final+model-change conflicts
            logger.info("Waiting for recognizer lock (final)...")
            with recognizer_lock:
                logger.info("Lock acquired, starting transcription (final)...")
                result = recognizer.transcribe(audio_bytes, language=lang_param)
        logger.info("Transcription complete: text_len=%d", len(result.get("text", "")))

        if not result["text"]:
            return

        # Build recognition result with speaker info
        rec_data = {
            "text": result["text"],
            "language": result["language"],
            "language_name": result.get("language_name", ""),
            "confidence": result.get("language_probability", 0),
            "segments": result.get("segments", []),
            "interim": is_interim,
        }
        if speaker_info:
            rec_data["speaker"] = speaker_info

        # Emit recognition result immediately
        if is_interim:
            emit("interim_result", rec_data)
            return  # Skip translation/TTS for interim results

        emit("recognition_result", rec_data)

        # Step 3: Translation (synchronous for immediate result) - only for final results
        detected_lang = result["language"]
        trans_result = translator.translate(
            result["text"],
            source_lang=detected_lang,
            target_lang=target_lang,
            mode=translation_mode,
        )

        if speaker_info:
            trans_result["speaker"] = speaker_info
        emit("translation_result", trans_result)

        # Step 4: TTS (background, non-blocking)
        if enable_tts and trans_result.get("translated"):
            def run_tts():
                try:
                    tts_result = tts_engine.synthesize(
                        trans_result["translated"],
                        language=target_lang,
                        voice=tts_voice,
                    )
                    if tts_result and tts_result.get("audio_url"):
                        socketio.emit(
                            "tts_result",
                            {
                                "audio_url": tts_result["audio_url"],
                                "text": trans_result["translated"],
                                "language": target_lang,
                            },
                            room=sid,
                        )
                except Exception as tts_err:
                    logger.warning("TTS error: %s", tts_err)

            socketio.start_background_task(run_tts)

    except Exception as e:
        logger.error("Error processing audio: %s", e)
        emit("error", {"message": str(e)})


@socketio.on("set_tts_voice")
def handle_set_voice(data):
    """Set TTS voice for a language."""
    language = data.get("language")
    voice_id = data.get("voice_id")
    if language and voice_id:
        tts_engine.set_voice(language, voice_id)
        emit(
            "status",
            {"message": f"语音已设置 / Voice updated: {voice_id}", "type": "info"},
        )


@socketio.on("tts_request")
def handle_tts_request(data):
    """Handle direct TTS request for previously translated text."""
    try:
        text = data.get("text", "")
        language = data.get("language", "zh")
        voice = data.get("voice")

        if not text or not text.strip():
            return

        tts_result = tts_engine.synthesize(
            text,
            language=language,
            voice=voice,
        )

        if tts_result.get("audio_url"):
            emit(
                "tts_result",
                {
                    "audio_url": tts_result["audio_url"],
                    "text": text,
                    "language": language,
                },
            )

    except Exception as e:
        logger.error("Error processing TTS request: %s", e)
        emit("error", {"message": str(e)})


@socketio.on("reset_speakers")
def handle_reset_speakers():
    """Reset speaker diarization profiles."""
    diarizer.reset()
    emit("status", {"message": "说话人已重置 / Speakers reset", "type": "info"})


@socketio.on("cleanup")
def handle_cleanup():
    """Clean up old TTS audio files."""
    tts_engine.cleanup_old_files()
    emit("status", {"message": "清理完成 / Cleanup done", "type": "info"})


# ==================== Main ====================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info("Starting Voice Translator on port %d", port)
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
