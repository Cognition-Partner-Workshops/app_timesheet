"""
Voice Translator - Main Application
Real-time multilingual speech recognition and translation system.
Supports Japanese, English, and Chinese.
"""

import logging
import os

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit

from recognition import SpeechRecognizer
from translation import Translator
from tts_module import TTSEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24).hex()

# Initialize SocketIO
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
    max_http_buffer_size=10 * 1024 * 1024,  # 10MB max for audio data
)

# Initialize modules
logger.info("Initializing speech recognizer...")
recognizer = SpeechRecognizer(model_size="base", device="cpu", compute_type="int8")

logger.info("Initializing translator...")
translator = Translator(max_workers=4)

logger.info("Initializing TTS engine...")
tts_engine = TTSEngine(
    audio_dir=os.path.join(os.path.dirname(__file__), "static", "audio"),
    max_workers=2,
)

logger.info("All modules initialized successfully!")


# ==================== HTTP Routes ====================


@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/api/languages")
def get_languages():
    """Get supported languages."""
    return jsonify(
        {
            "recognition": [
                {"code": "auto", "label": "自动检测 / Auto Detect"},
                {"code": "ja", "label": "日本語"},
                {"code": "en", "label": "English"},
                {"code": "zh", "label": "中文"},
            ],
            "translation": translator.get_supported_languages(),
            "tts_voices": tts_engine.get_voice_options(),
        }
    )


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
        "tts_voice": null        # Custom TTS voice (optional)
    }
    """
    try:
        audio_bytes = data.get("audio")
        language = data.get("language", "auto")
        target_lang = data.get("target_lang", "zh")
        enable_tts = data.get("enable_tts", True)
        tts_voice = data.get("tts_voice")

        if not audio_bytes:
            return

        # Step 1: Speech Recognition
        lang_param = None if language == "auto" else language
        result = recognizer.transcribe(audio_bytes, language=lang_param)

        if not result["text"]:
            return

        # Emit recognition result immediately
        emit(
            "recognition_result",
            {
                "text": result["text"],
                "language": result["language"],
                "language_name": result.get("language_name", ""),
                "confidence": result.get("language_probability", 0),
                "segments": result.get("segments", []),
            },
        )

        # Step 2: Translation (async, does not block recognition)
        detected_lang = result["language"]

        def on_translation_done(trans_result):
            """Callback when translation is complete."""
            socketio.emit(
                "translation_result",
                trans_result,
                room=request.sid,
            )

            # Step 3: TTS (async, if enabled)
            if enable_tts and trans_result.get("translated"):
                def on_tts_done(tts_result):
                    """Callback when TTS is complete."""
                    if tts_result.get("audio_url"):
                        socketio.emit(
                            "tts_result",
                            {
                                "audio_url": tts_result["audio_url"],
                                "text": trans_result["translated"],
                                "language": target_lang,
                            },
                            room=request.sid,
                        )

                tts_engine.synthesize_async(
                    trans_result["translated"],
                    language=target_lang,
                    voice=tts_voice,
                    callback=on_tts_done,
                )

        translator.translate_async(
            result["text"],
            source_lang=detected_lang,
            target_lang=target_lang,
            callback=on_translation_done,
        )

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
