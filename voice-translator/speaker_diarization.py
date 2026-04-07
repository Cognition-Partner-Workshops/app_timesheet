"""
Speaker Diarization Module
Identifies and tracks different speakers using audio feature analysis.
Uses spectral features and cosine similarity for speaker matching.
"""

import logging
import numpy as np
from collections import OrderedDict

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


class SpeakerDiarizer:
    """Speaker identification using audio feature analysis."""

    def __init__(self, similarity_threshold=0.82, max_speakers=MAX_SPEAKERS):
        """
        Initialize the speaker diarizer.

        Args:
            similarity_threshold: Cosine similarity threshold for speaker matching.
                Higher values require closer match (0.0-1.0).
            max_speakers: Maximum number of distinct speakers to track.
        """
        self.similarity_threshold = similarity_threshold
        self.max_speakers = min(max_speakers, MAX_SPEAKERS)
        self.speaker_profiles = OrderedDict()
        self.speaker_counter = 0
        logger.info(
            "SpeakerDiarizer initialized (threshold=%.2f, max_speakers=%d)",
            similarity_threshold,
            self.max_speakers,
        )

    def _extract_features(self, audio_np):
        """
        Extract speaker-discriminative features from audio.

        Args:
            audio_np: Numpy array of audio samples (float32, normalized).

        Returns:
            Feature vector (numpy array) or None if audio is too short.
        """
        if len(audio_np) < 1600:  # Less than 0.1s at 16kHz
            return None

        features = []

        # 1. RMS Energy
        rms = np.sqrt(np.mean(audio_np ** 2))
        features.append(rms)

        # 2. Zero Crossing Rate
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio_np)))) / (
            2 * len(audio_np)
        )
        features.append(zero_crossings)

        # 3. Spectral features via FFT
        n_fft = min(2048, len(audio_np))
        # Use multiple frames and average
        hop_length = n_fft // 2
        n_frames = max(1, (len(audio_np) - n_fft) // hop_length + 1)

        spectral_centroids = []
        spectral_bandwidths = []
        spectral_rolloffs = []
        spectral_flatness_vals = []

        for i in range(min(n_frames, 20)):  # Limit to 20 frames
            start = i * hop_length
            end = start + n_fft
            if end > len(audio_np):
                break

            frame = audio_np[start:end]
            windowed = frame * np.hanning(len(frame))
            spectrum = np.abs(np.fft.rfft(windowed))

            if np.sum(spectrum) < 1e-10:
                continue

            freqs = np.fft.rfftfreq(len(windowed), d=1.0 / 16000)

            # Spectral centroid
            centroid = np.sum(freqs * spectrum) / (np.sum(spectrum) + 1e-10)
            spectral_centroids.append(centroid)

            # Spectral bandwidth
            bandwidth = np.sqrt(
                np.sum(((freqs - centroid) ** 2) * spectrum)
                / (np.sum(spectrum) + 1e-10)
            )
            spectral_bandwidths.append(bandwidth)

            # Spectral rolloff (85th percentile)
            cumsum = np.cumsum(spectrum)
            rolloff_idx = np.searchsorted(cumsum, 0.85 * cumsum[-1])
            rolloff_freq = freqs[min(rolloff_idx, len(freqs) - 1)]
            spectral_rolloffs.append(rolloff_freq)

            # Spectral flatness
            geo_mean = np.exp(np.mean(np.log(spectrum + 1e-10)))
            arith_mean = np.mean(spectrum) + 1e-10
            flatness = geo_mean / arith_mean
            spectral_flatness_vals.append(flatness)

        if not spectral_centroids:
            return None

        # Aggregate spectral features (mean and std)
        features.extend([
            np.mean(spectral_centroids),
            np.std(spectral_centroids),
            np.mean(spectral_bandwidths),
            np.std(spectral_bandwidths),
            np.mean(spectral_rolloffs),
            np.std(spectral_rolloffs),
            np.mean(spectral_flatness_vals),
            np.std(spectral_flatness_vals),
        ])

        # 4. Pitch estimation via autocorrelation
        pitch = self._estimate_pitch(audio_np)
        features.append(pitch if pitch > 0 else 200.0)  # Default pitch

        # 5. MFCC-like features (simplified)
        mfcc_features = self._compute_mfcc_like(audio_np)
        features.extend(mfcc_features)

        feature_vector = np.array(features, dtype=np.float32)

        # Normalize feature vector
        norm = np.linalg.norm(feature_vector)
        if norm > 0:
            feature_vector = feature_vector / norm

        return feature_vector

    def _estimate_pitch(self, audio_np, sr=16000):
        """
        Estimate fundamental frequency using autocorrelation.

        Args:
            audio_np: Audio samples.
            sr: Sample rate.

        Returns:
            Estimated pitch in Hz, or 0 if unvoiced.
        """
        # Focus on typical speech pitch range (80-400 Hz)
        min_lag = sr // 400  # 40 samples
        max_lag = sr // 80   # 200 samples

        if len(audio_np) < max_lag * 2:
            return 0.0

        # Use center portion of audio
        center = len(audio_np) // 2
        half_win = min(4000, center)
        segment = audio_np[center - half_win:center + half_win]

        # Autocorrelation
        corr = np.correlate(segment, segment, mode="full")
        corr = corr[len(corr) // 2:]

        # Normalize
        if corr[0] > 0:
            corr = corr / corr[0]

        # Find peak in valid range
        if max_lag >= len(corr):
            return 0.0

        search_region = corr[min_lag:max_lag]
        if len(search_region) == 0:
            return 0.0

        peak_idx = np.argmax(search_region) + min_lag

        # Verify it's a real peak (correlation > 0.3)
        if corr[peak_idx] < 0.3:
            return 0.0

        pitch = sr / peak_idx
        return pitch

    def _compute_mfcc_like(self, audio_np, n_mfcc=13, sr=16000):
        """
        Compute simplified MFCC-like features.

        Args:
            audio_np: Audio samples.
            n_mfcc: Number of coefficients.
            sr: Sample rate.

        Returns:
            List of MFCC-like coefficients.
        """
        n_fft = min(2048, len(audio_np))
        if n_fft < 256:
            return [0.0] * n_mfcc

        # Compute power spectrum
        windowed = audio_np[:n_fft] * np.hanning(n_fft)
        spectrum = np.abs(np.fft.rfft(windowed)) ** 2

        # Create mel filterbank
        n_mels = 26
        low_freq = 0
        high_freq = sr / 2

        low_mel = 2595 * np.log10(1 + low_freq / 700)
        high_mel = 2595 * np.log10(1 + high_freq / 700)
        mel_points = np.linspace(low_mel, high_mel, n_mels + 2)
        hz_points = 700 * (10 ** (mel_points / 2595) - 1)
        bin_points = np.floor((n_fft + 1) * hz_points / sr).astype(int)

        filterbank = np.zeros((n_mels, n_fft // 2 + 1))
        for m in range(1, n_mels + 1):
            f_left = bin_points[m - 1]
            f_center = bin_points[m]
            f_right = bin_points[m + 1]

            for k in range(f_left, f_center):
                if f_center > f_left:
                    filterbank[m - 1, k] = (k - f_left) / (f_center - f_left)
            for k in range(f_center, f_right):
                if f_right > f_center:
                    filterbank[m - 1, k] = (f_right - k) / (f_right - f_center)

        # Apply filterbank
        mel_spectrum = np.dot(filterbank, spectrum)
        mel_spectrum = np.log(mel_spectrum + 1e-10)

        # DCT to get MFCCs
        mfcc = np.zeros(n_mfcc)
        for i in range(n_mfcc):
            mfcc[i] = np.sum(
                mel_spectrum
                * np.cos(np.pi * i * (np.arange(n_mels) + 0.5) / n_mels)
            )

        return mfcc.tolist()

    def _cosine_similarity(self, a, b):
        """Compute cosine similarity between two vectors."""
        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def identify_speaker(self, audio_bytes):
        """
        Identify the speaker from audio data.

        Args:
            audio_bytes: Raw PCM audio bytes (16-bit, mono, 16kHz).

        Returns:
            dict with speaker_id, speaker_label, speaker_color, is_new.
        """
        try:
            # Convert to float32
            audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(
                np.float32
            )
            audio_np = audio_np / 32768.0

            # Check if audio is too quiet
            if np.max(np.abs(audio_np)) < 0.01:
                return self._unknown_speaker()

            # Extract features
            features = self._extract_features(audio_np)
            if features is None:
                return self._unknown_speaker()

            # Match against known speakers
            best_match = None
            best_similarity = -1.0

            for speaker_id, profile in self.speaker_profiles.items():
                similarity = self._cosine_similarity(features, profile["features"])
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = speaker_id

            # Check if match is good enough
            if best_match and best_similarity >= self.similarity_threshold:
                # Update speaker profile with running average
                profile = self.speaker_profiles[best_match]
                alpha = 0.3  # Learning rate for profile update
                profile["features"] = (
                    (1 - alpha) * profile["features"] + alpha * features
                )
                # Re-normalize
                norm = np.linalg.norm(profile["features"])
                if norm > 0:
                    profile["features"] = profile["features"] / norm
                profile["count"] += 1

                return {
                    "speaker_id": best_match,
                    "speaker_label": profile["label"],
                    "speaker_color": profile["color"],
                    "is_new": False,
                    "confidence": round(float(best_similarity), 3),
                }

            # New speaker
            if len(self.speaker_profiles) >= self.max_speakers:
                # Assign to least-used speaker if limit reached
                least_used = min(
                    self.speaker_profiles.items(),
                    key=lambda x: x[1]["count"],
                )
                return {
                    "speaker_id": least_used[0],
                    "speaker_label": least_used[1]["label"],
                    "speaker_color": least_used[1]["color"],
                    "is_new": False,
                    "confidence": round(float(best_similarity), 3),
                }

            self.speaker_counter += 1
            speaker_id = f"speaker_{self.speaker_counter}"
            color_idx = (self.speaker_counter - 1) % len(SPEAKER_COLORS)
            label = f"Speaker {self.speaker_counter}"

            self.speaker_profiles[speaker_id] = {
                "features": features,
                "label": label,
                "color": SPEAKER_COLORS[color_idx],
                "count": 1,
            }

            logger.info(
                "New speaker detected: %s (total: %d)",
                label,
                len(self.speaker_profiles),
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
