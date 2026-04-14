"""
Translation Module
Uses deep-translator (Google Translate) for multilingual text translation.
Supports Chinese, English, Japanese, and Korean.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)

# Supported language codes for translation
TRANSLATION_LANGUAGES = {
    "zh": "zh-CN",
    "en": "en",
    "ja": "ja",
    "ko": "ko",
    "yue": "zh-CN",   # Cantonese -> Chinese (Simplified) for Google Translate
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
}

LANGUAGE_LABELS = {
    "zh": "中文",
    "en": "English",
    "ja": "日本語",
    "ko": "한국어",
    "yue": "粤语",
}


class Translator:
    """Text translator using Google Translate (deep-translator)."""

    def __init__(self, max_workers=4):
        """
        Initialize the translator.

        Args:
            max_workers: Maximum number of concurrent translation threads
        """
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._translators = {}
        logger.info("Google Translator initialized with max_workers=%d", max_workers)

    def _get_translator(self, source, target):
        """Get or create a translator instance for the given language pair."""
        key = f"{source}-{target}"
        if key not in self._translators:
            src_code = TRANSLATION_LANGUAGES.get(source, source)
            tgt_code = TRANSLATION_LANGUAGES.get(target, target)
            self._translators[key] = GoogleTranslator(
                source=src_code, target=tgt_code
            )
        return self._translators[key]

    def translate(self, text, source_lang, target_lang="zh"):
        """
        Translate text synchronously.

        Args:
            text: Text to translate
            source_lang: Source language code ('ja', 'en', 'zh')
            target_lang: Target language code (default: 'zh')

        Returns:
            dict with keys: original, translated, source_lang, target_lang
        """
        if not text or not text.strip():
            return {
                "original": text,
                "translated": "",
                "source_lang": source_lang,
                "target_lang": target_lang,
            }

        # Normalize codes so e.g. yue and zh both map to zh-CN
        src_resolved = TRANSLATION_LANGUAGES.get(source_lang, source_lang)
        tgt_resolved = TRANSLATION_LANGUAGES.get(target_lang, target_lang)

        # Skip translation if source and target resolve to the same code
        if source_lang == target_lang or src_resolved == tgt_resolved:
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
            }

        try:
            translator = self._get_translator(source_lang, target_lang)
            translated = translator.translate(text.strip())
            return {
                "original": text.strip(),
                "translated": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "source_label": LANGUAGE_LABELS.get(source_lang, source_lang),
                "target_label": LANGUAGE_LABELS.get(target_lang, target_lang),
            }
        except Exception as e:
            logger.error("Google translation error (%s->%s): %s", source_lang, target_lang, e)
            return {
                "original": text.strip(),
                "translated": f"[翻译错误: {e}]",
                "source_lang": source_lang,
                "target_lang": target_lang,
                "error": str(e),
            }

    def translate_async(self, text, source_lang, target_lang="zh", callback=None):
        """
        Translate text asynchronously (non-blocking).

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            callback: Function to call with translation result

        Returns:
            Future object
        """
        future = self.executor.submit(self.translate, text, source_lang, target_lang)
        if callback:
            future.add_done_callback(lambda f: callback(f.result()))
        return future

    def get_supported_languages(self):
        """Return list of supported languages."""
        return [
            {"code": code, "label": label}
            for code, label in LANGUAGE_LABELS.items()
        ]

    def shutdown(self):
        """Shutdown the translator thread pool."""
        self.executor.shutdown(wait=False)
        logger.info("Google Translator shutdown")


class TranslationManager:
    """Manages translation using Google Translate."""

    def __init__(self, max_workers=4):
        """
        Initialize the translation manager.

        Args:
            max_workers: Max workers for the translator
        """
        self.google_translator = Translator(max_workers=max_workers)
        logger.info("TranslationManager initialized (Google Translate)")

    def translate(self, text, source_lang, target_lang="zh", **kwargs):
        """
        Translate text using Google Translate.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            dict with translation result
        """
        result = self.google_translator.translate(text, source_lang, target_lang)
        result["engine"] = "google"
        return result

    def translate_async(
        self, text, source_lang, target_lang="zh", callback=None, **kwargs,
    ):
        """
        Translate text asynchronously.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            callback: Function to call with result

        Returns:
            Future object
        """
        future = self.google_translator.executor.submit(
            self.translate, text, source_lang, target_lang
        )

        if callback:
            future.add_done_callback(lambda f: callback(f.result()))
        return future

    def get_supported_languages(self):
        """Return list of supported languages."""
        return self.google_translator.get_supported_languages()

    def shutdown(self):
        """Shutdown the translator."""
        self.google_translator.shutdown()
        logger.info("TranslationManager shutdown")
