"""
Voice Translator - Main Application
Real-time multilingual speech recognition and translation system.
Supports Japanese, English, and Chinese.
"""

import logging
import os
import threading

import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory
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
diarizer = SpeakerDiarizer(similarity_threshold=0.82)

logger.info("Initializing TTS engine...")
tts_engine = TTSEngine(
    audio_dir=os.path.join(os.path.dirname(__file__), "static", "audio"),
    max_workers=2,
)

logger.info("All modules initialized successfully!")

# Lock for thread-safe access to recognizer
recognizer_lock = threading.Lock()


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
        "enable_diarization": true     # Speaker diarization toggle
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

        if not audio_bytes:
            logger.warning("No audio bytes received")
            return

        # Quick silence check before any heavy processing
        # This prevents Whisper from hanging on empty/silent audio
        audio_np_quick = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        rms_energy = float(np.sqrt(np.mean(audio_np_quick ** 2)))
        logger.info(
            "Received audio: %d bytes, rms=%.6f, lang=%s, target=%s, mode=%s",
            len(audio_bytes), rms_energy, language, target_lang, translation_mode,
        )
        if rms_energy < 0.005:
            logger.info("Skipping silent audio (rms=%.6f < 0.005)", rms_energy)
            return

        # Capture sid while still in request context
        sid = request.sid

        # Step 1: Speaker diarization (fast, run first)
        speaker_info = None
        if enable_diarization:
            try:
                speaker_info = diarizer.identify_speaker(audio_bytes)
            except Exception as e:
                logger.warning("Speaker diarization error: %s", e)

        # Step 2: Speech Recognition (thread-safe with lock)
        lang_param = None if language == "auto" else language
        with recognizer_lock:
            result = recognizer.transcribe(audio_bytes, language=lang_param)

        if not result["text"]:
            return

        # Build recognition result with speaker info
        rec_data = {
            "text": result["text"],
            "language": result["language"],
            "language_name": result.get("language_name", ""),
            "confidence": result.get("language_probability", 0),
            "segments": result.get("segments", []),
        }
        if speaker_info:
            rec_data["speaker"] = speaker_info

        # Emit recognition result immediately
        emit("recognition_result", rec_data)

        # Step 3: Translation (synchronous for immediate result)
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
