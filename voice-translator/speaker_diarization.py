"""
Speaker Diarization Module
Identifies and tracks different speakers using neural speaker embeddings.
Uses 3D-Speaker CAM++ model via sherpa-onnx for high-accuracy speaker identification.
"""

import logging
import os
import urllib.request

import numpy as np

logger = logging.getLogger(__name__)

# Speaker colors for UI display
SPEAKER_COLORS = [
    "#4f46e5",  # Indigo
    "#22c55e",  # Green
    "#f59e0b",  # Amber
    "#ef4444",  # Red
    "#8b5cf6",  # Violet
    "#06b6d4",  # Cyan
    "#ec4899",  # Pink
    "#14b8a6",  # Teal
]

MAX_SPEAKERS = len(SPEAKER_COLORS)

# Model configuration
EMBEDDING_MODEL_FILENAME = "3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx"
EMBEDDING_MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/"
    "speaker-recongition-models/"
    + EMBEDDING_MODEL_FILENAME
)
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def _download_embedding_model(dest_path):
    """Download the speaker embedding model if not present."""
    if os.path.exists(dest_path):
        return True
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    logger.info("Downloading speaker embedding model to %s ...", dest_path)
    try:
        urllib.request.urlretrieve(EMBEDDING_MODEL_URL, dest_path)
        size_mb = os.path.getsize(dest_path) / (1024 * 1024)
        logger.info("Speaker embedding model downloaded (%.1f MB)", size_mb)
        return True
    except Exception as e:
        logger.error("Failed to download speaker embedding model: %s", e)
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


class SpeakerDiarizer:
    """Speaker identification using neural speaker embeddings (3D-Speaker CAM++)."""

    def __init__(self, similarity_threshold=0.55, max_speakers=MAX_SPEAKERS):
        """
        Initialize the speaker diarizer.

        Args:
            similarity_threshold: Cosine similarity threshold for speaker matching.
                For neural embeddings, 0.5-0.6 is typical (embeddings are more
                discriminative than hand-crafted features).
            max_speakers: Maximum number of distinct speakers to track.
        """
        self.similarity_threshold = similarity_threshold
        self.max_speakers = min(max_speakers, MAX_SPEAKERS)
        self.speaker_profiles = {}  # speaker_id -> {mean_embedding, label, color, count}
        self.speaker_counter = 0
        self.extractor = None
        self._initialized = False

        self._init_extractor()

        logger.info(
            "SpeakerDiarizer initialized (threshold=%.2f, max_speakers=%d, neural=%s)",
            similarity_threshold,
            self.max_speakers,
            self._initialized,
        )

    def _init_extractor(self):
        """Initialize the sherpa-onnx speaker embedding extractor."""
        try:
            import sherpa_onnx
        except ImportError:
            logger.warning(
                "sherpa-onnx not installed. Speaker diarization disabled. "
                "Install with: pip install sherpa-onnx"
            )
            return

        model_path = os.path.join(MODELS_DIR, EMBEDDING_MODEL_FILENAME)

        if not os.path.exists(model_path):
            if not _download_embedding_model(model_path):
                logger.warning(
                    "Speaker embedding model not available. "
                    "Diarization disabled."
                )
                return

        try:
            config = sherpa_onnx.SpeakerEmbeddingExtractorConfig(
                model=model_path,
                num_threads=2,
                provider="cpu",
            )
            self.extractor = sherpa_onnx.SpeakerEmbeddingExtractor(config)
            self._initialized = True
            logger.info(
                "Neural speaker embedding extractor loaded "
                "(model=%s, dim=%d)",
                EMBEDDING_MODEL_FILENAME,
                self.extractor.dim,
            )
        except Exception as e:
            logger.error("Failed to load speaker embedding model: %s", e)

    def _extract_embedding(self, audio_np):
        """
        Extract speaker embedding from audio using neural model.

        Args:
            audio_np: Numpy array of float32 audio samples (16kHz, normalized to [-1, 1]).

        Returns:
            List of floats (embedding vector) or None if extraction fails.
        """
        if self.extractor is None:
            return None

        if len(audio_np) < 3200:  # Less than 0.2s at 16kHz - too short
            return None

        try:
            stream = self.extractor.create_stream()
            stream.accept_waveform(
                sample_rate=16000, waveform=audio_np.tolist()
            )
            stream.input_finished()

            if not self.extractor.is_ready(stream):
                return None

            embedding = self.extractor.compute(stream)
            return embedding
        except Exception as e:
            logger.warning("Embedding extraction error: %s", e)
            return None

    @staticmethod
    def _cosine_similarity(a, b):
        """Compute cosine similarity between two embedding vectors."""
        a_arr = np.array(a, dtype=np.float32)
        b_arr = np.array(b, dtype=np.float32)
        dot = float(np.dot(a_arr, b_arr))
        norm_a = float(np.linalg.norm(a_arr))
        norm_b = float(np.linalg.norm(b_arr))
        if norm_a < 1e-10 or norm_b < 1e-10:
            return 0.0
        return dot / (norm_a * norm_b)

    def identify_speaker(self, audio_bytes):
        """
        Identify the speaker from audio data using neural embeddings.

        Args:
            audio_bytes: Raw PCM audio bytes (16-bit, mono, 16kHz).

        Returns:
            dict with speaker_id, speaker_label, speaker_color, is_new, confidence.
        """
        if not self._initialized:
            return self._unknown_speaker()

        try:
            # Convert bytes to float32 samples
            audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(
                np.float32
            )
            audio_np = audio_np / 32768.0

            # Check if audio has enough energy
            rms = float(np.sqrt(np.mean(audio_np ** 2)))
            if rms < 0.0001:
                return self._unknown_speaker()

            # Extract neural embedding
            embedding = self._extract_embedding(audio_np)
            if embedding is None:
                return self._unknown_speaker()

            # Match against known speakers
            best_match = None
            best_similarity = -1.0

            for speaker_id, profile in self.speaker_profiles.items():
                similarity = self._cosine_similarity(
                    embedding, profile["mean_embedding"]
                )
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = speaker_id

            # Check if match is good enough
            if best_match is not None and best_similarity >= self.similarity_threshold:
                profile = self.speaker_profiles[best_match]
                # Update mean embedding with exponential moving average
                alpha = min(0.3, 1.0 / (profile["count"] + 1))
                old_emb = np.array(profile["mean_embedding"], dtype=np.float32)
                new_emb = np.array(embedding, dtype=np.float32)
                updated = (1 - alpha) * old_emb + alpha * new_emb
                # Re-normalize
                norm = float(np.linalg.norm(updated))
                if norm > 0:
                    updated = updated / norm
                profile["mean_embedding"] = updated.tolist()
                profile["count"] += 1

                logger.debug(
                    "Speaker matched: %s (sim=%.3f, count=%d)",
                    profile["label"],
                    best_similarity,
                    profile["count"],
                )

                return {
                    "speaker_id": best_match,
                    "speaker_label": profile["label"],
                    "speaker_color": profile["color"],
                    "is_new": False,
                    "confidence": round(best_similarity, 3),
                }

            # New speaker
            if len(self.speaker_profiles) >= self.max_speakers:
                # If max speakers reached, assign to the closest match
                if best_match is not None:
                    profile = self.speaker_profiles[best_match]
                    return {
                        "speaker_id": best_match,
                        "speaker_label": profile["label"],
                        "speaker_color": profile["color"],
                        "is_new": False,
                        "confidence": round(best_similarity, 3),
                    }
                return self._unknown_speaker()

            self.speaker_counter += 1
            speaker_id = f"speaker_{self.speaker_counter}"
            color_idx = (self.speaker_counter - 1) % len(SPEAKER_COLORS)
            label = f"Speaker {self.speaker_counter}"

            # Normalize embedding for storage
            emb_arr = np.array(embedding, dtype=np.float32)
            norm = float(np.linalg.norm(emb_arr))
            if norm > 0:
                emb_arr = emb_arr / norm

            self.speaker_profiles[speaker_id] = {
                "mean_embedding": emb_arr.tolist(),
                "label": label,
                "color": SPEAKER_COLORS[color_idx],
                "count": 1,
            }

            logger.info(
                "New speaker detected: %s (total: %d, embedding_dim=%d)",
                label,
                len(self.speaker_profiles),
                len(embedding),
            )

            return {
                "speaker_id": speaker_id,
                "speaker_label": label,
                "speaker_color": SPEAKER_COLORS[color_idx],
                "is_new": True,
                "confidence": 1.0,
            }

        except Exception as e:
            logger.error("Speaker identification error: %s", e)
            return self._unknown_speaker()

    def _unknown_speaker(self):
        """Return default unknown speaker info."""
        return {
            "speaker_id": "unknown",
            "speaker_label": "Unknown",
            "speaker_color": "#64748b",
            "is_new": False,
            "confidence": 0.0,
        }

    def reset(self):
        """Reset all speaker profiles."""
        self.speaker_profiles.clear()
        self.speaker_counter = 0
        logger.info("Speaker profiles reset")

    def get_speakers(self):
        """Return list of currently tracked speakers."""
        return [
            {
                "id": sid,
                "label": profile["label"],
                "color": profile["color"],
                "count": profile["count"],
            }
            for sid, profile in self.speaker_profiles.items()
        ]

    def is_neural(self):
        """Return True if using neural embeddings."""
        return self._initialized
