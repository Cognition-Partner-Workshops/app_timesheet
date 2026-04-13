"""
MinIO client utility for object storage.
"""
import logging
from typing import Optional

from api.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_minio_client = None


def get_minio():
    """Get or create MinIO client."""
    global _minio_client
    if _minio_client is None:
        try:
            from minio import Minio
            _minio_client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False,
            )
            # Ensure bucket exists
            if not _minio_client.bucket_exists(settings.MINIO_BUCKET_AUDIO):
                _minio_client.make_bucket(settings.MINIO_BUCKET_AUDIO)
        except ImportError:
            logger.warning("minio package not available")
            return None
        except Exception as e:
            logger.warning(f"Failed to connect to MinIO: {e}")
            return None
    return _minio_client


def upload_audio(word_id: str, data: bytes, engine: str = "melotts") -> Optional[str]:
    """Upload audio file to MinIO."""
    import io
    client = get_minio()
    if not client:
        return None

    object_name = f"audio/{engine}/{word_id}.mp3"
    try:
        client.put_object(
            settings.MINIO_BUCKET_AUDIO,
            object_name,
            io.BytesIO(data),
            len(data),
            content_type="audio/mpeg",
        )
        return object_name
    except Exception as e:
        logger.error(f"MinIO upload error: {e}")
        return None


def get_audio_url(object_name: str) -> Optional[str]:
    """Get presigned URL for an audio file."""
    from datetime import timedelta
    client = get_minio()
    if not client:
        return None

    try:
        url = client.presigned_get_object(
            settings.MINIO_BUCKET_AUDIO,
            object_name,
            expires=timedelta(hours=1),
        )
        return url
    except Exception as e:
        logger.error(f"MinIO URL generation error: {e}")
        return None
