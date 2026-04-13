"""
MeloTTS FastAPI Server - Self-hosted TTS service for LingoMaster.
Provides multi-language text-to-speech synthesis.
"""
import io
import logging

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LingoMaster TTS Service", version="1.0.0")

# Language to voice mapping
LANGUAGE_VOICE_MAP = {
    "en": {"voice": "EN", "name": "English"},
    "fr": {"voice": "FR", "name": "French"},
    "ja": {"voice": "JP", "name": "Japanese"},
    "de": {"voice": "DE", "name": "German"},
    "es": {"voice": "ES", "name": "Spanish"},
    "zh": {"voice": "ZH", "name": "Chinese"},
}

# TTS model (loaded lazily)
_tts_model = None


def get_tts_model():
    """Load TTS model lazily."""
    global _tts_model
    if _tts_model is None:
        try:
            from melo.api import TTS
            _tts_model = TTS(language="EN", device="cpu")
            logger.info("MeloTTS model loaded successfully")
        except ImportError:
            logger.warning("MeloTTS not available, using placeholder")
            _tts_model = "placeholder"
    return _tts_model


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="要合成的文本")
    language: str = Field(default="en", description="语言代码")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")
    format: str = Field(default="mp3", description="输出格式")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "service": "tts"}


@app.get("/api/v1/tts/languages")
async def get_languages():
    """获取支持的语言列表"""
    languages = [
        {"code": code, "name": info["name"]}
        for code, info in LANGUAGE_VOICE_MAP.items()
    ]
    return {"languages": languages}


@app.post("/api/v1/tts/synthesize")
async def synthesize(request: SynthesizeRequest):
    """合成语音"""
    if request.language not in LANGUAGE_VOICE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的语言: {request.language}，支持: {list(LANGUAGE_VOICE_MAP.keys())}"
        )

    model = get_tts_model()

    if model == "placeholder":
        # Return a minimal valid audio file when model is not available
        import struct
        # Generate a simple WAV header with silence
        sample_rate = 22050
        duration = 0.5
        num_samples = int(sample_rate * duration)
        audio_data = b'\x00\x00' * num_samples

        wav_header = struct.pack(
            '<4sI4s4sIHHIIHH4sI',
            b'RIFF',
            36 + len(audio_data),
            b'WAVE',
            b'fmt ',
            16, 1, 1, sample_rate,
            sample_rate * 2, 2, 16,
            b'data',
            len(audio_data),
        )

        return StreamingResponse(
            io.BytesIO(wav_header + audio_data),
            media_type="audio/wav",
            headers={"X-TTS-Engine": "placeholder"},
        )

    try:
        voice_info = LANGUAGE_VOICE_MAP[request.language]

        # Generate speech
        speaker_ids = model.hps.data.spk2id
        speaker_key = voice_info["voice"]
        speaker_id = speaker_ids.get(speaker_key, 0)

        audio_data = model.tts_to_file(
            request.text,
            speaker_id,
            speed=request.speed,
            quiet=True,
        )

        # Convert to bytes
        import soundfile as sf
        buffer = io.BytesIO()
        sf.write(buffer, audio_data, model.hps.data.sampling_rate, format="WAV")
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="audio/wav",
            headers={"X-TTS-Engine": "melotts"},
        )

    except Exception as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"语音合成失败: {str(e)}"
        )
