"""
Translation Module
Uses deep-translator (Google Translate) and argostranslate (AI model) for
multilingual text translation. Supports Chinese, English, and Japanese.
Provides a TranslationManager to switch between engines.
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
}

LANGUAGE_LABELS = {
    "zh": "中文",
    "en": "English",
    "ja": "日本語",
}

# Argos language codes
ARGOS_LANG_MAP = {
    "zh": "zh",
    "en": "en",
    "ja": "ja",
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

        # Skip translation if source and target are the same
        if source_lang == target_lang:
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
            logger.error("Google translation error: %s", e)
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


class AITranslator:
    """Text translator using argostranslate (offline AI model)."""

    def __init__(self, max_workers=2):
        """
        Initialize the AI translator with argostranslate.

        Args:
            max_workers: Maximum number of concurrent translation threads
        """
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self._installed_pairs = set()
        self._initialized = False
        self._init_error = None
        logger.info("AITranslator initializing...")
        self._initialize()

    def _initialize(self):
        """Initialize argostranslate and install required language packages."""
        try:
            import argostranslate.package
            import argostranslate.translate

            # Update package index
            argostranslate.package.update_package_index()

            # Required language pairs
            required_pairs = [
                ("en", "zh"),
                ("zh", "en"),
                ("en", "ja"),
                ("ja", "en"),
            ]

            available = argostranslate.package.get_available_packages()

            for from_code, to_code in required_pairs:
                # Check if already installed
                installed_langs = argostranslate.translate.get_installed_languages()
                pair_exists = False
                from_lang = next(
                    (lang for lang in installed_langs if lang.code == from_code),
                    None,
                )
                to_lang = next(
                    (lang for lang in installed_langs if lang.code == to_code),
                    None,
                )
                if from_lang and to_lang:
                    translation = from_lang.get_translation(to_lang)
                    pair_exists = translation is not None

                if pair_exists:
                    self._installed_pairs.add((from_code, to_code))
                    continue

                # Find and install the package
                pkg = next(
                    (
                        p
                        for p in available
                        if p.from_code == from_code and p.to_code == to_code
                    ),
                    None,
                )
                if pkg:
                    logger.info(
                        "Installing argos package: %s -> %s", from_code, to_code
                    )
                    download_path = pkg.download()
                    argostranslate.package.install_from_path(download_path)
                    self._installed_pairs.add((from_code, to_code))
                    logger.info(
                        "Installed argos package: %s -> %s", from_code, to_code
                    )
                else:
                    logger.warning(
                        "Argos package not found: %s -> %s", from_code, to_code
                    )

            self._initialized = True
            logger.info(
                "AITranslator initialized with %d language pairs",
                len(self._installed_pairs),
            )

        except ImportError:
            self._init_error = "argostranslate not installed"
            logger.error(
                "argostranslate not installed, AI translation unavailable"
            )
        except Exception as e:
            self._init_error = str(e)
            logger.error("AITranslator initialization error: %s", e)

    def translate(self, text, source_lang, target_lang="zh"):
        """
        Translate text using argostranslate.

        For language pairs without direct support (e.g., ja->zh),
        uses English as an intermediate language.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            dict with translation result
        """
        if not text or not text.strip():
            return {
                "original": text,
                "translated": "",
                "source_lang": source_lang,
                "target_lang": target_lang,
            }

        if source_lang == target_lang:
            return {
                "original": text,
                "translated": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
            }

        if not self._initialized:
            return {
                "original": text.strip(),
                "translated": "[AI翻译未就绪: %s]" % (self._init_error or ""),
                "source_lang": source_lang,
                "target_lang": target_lang,
                "error": self._init_error or "not initialized",
            }

        try:
            import argostranslate.translate

            src = ARGOS_LANG_MAP.get(source_lang, source_lang)
            tgt = ARGOS_LANG_MAP.get(target_lang, target_lang)

            # Check if direct translation is available
            if (src, tgt) in self._installed_pairs:
                translated = argostranslate.translate.translate(
                    text.strip(), src, tgt
                )
            else:
                # Use English as intermediate (e.g., ja->en->zh)
                intermediate = argostranslate.translate.translate(
                    text.strip(), src, "en"
                )
                translated = argostranslate.translate.translate(
                    intermediate, "en", tgt
                )

            return {
                "original": text.strip(),
                "translated": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "source_label": LANGUAGE_LABELS.get(source_lang, source_lang),
                "target_label": LANGUAGE_LABELS.get(target_lang, target_lang),
                "engine": "ai",
            }

        except Exception as e:
            logger.error("AI translation error: %s", e)
            return {
                "original": text.strip(),
                "translated": "[AI翻译错误: %s]" % str(e),
                "source_lang": source_lang,
                "target_lang": target_lang,
                "error": str(e),
            }

    def translate_async(self, text, source_lang, target_lang="zh", callback=None):
        """Translate text asynchronously."""
        future = self.executor.submit(
            self.translate, text, source_lang, target_lang
        )
        if callback:
            future.add_done_callback(lambda f: callback(f.result()))
        return future

    def is_available(self):
        """Check if AI translation is available."""
        return self._initialized

    def get_installed_pairs(self):
        """Return list of installed language pairs."""
        return list(self._installed_pairs)

    def shutdown(self):
        """Shutdown the translator thread pool."""
        self.executor.shutdown(wait=False)
        logger.info("AITranslator shutdown")


class TranslationManager:
    """Manages multiple translation engines and routes requests."""

    def __init__(self, max_workers=4):
        """
        Initialize the translation manager.

        Args:
            max_workers: Max workers for each translator engine
        """
        self.google_translator = Translator(max_workers=max_workers)
        self.ai_translator = None
        self._ai_init_attempted = False
        logger.info("TranslationManager initialized")

    def init_ai_translator(self, max_workers=2):
        """Initialize the AI translator (can be called lazily)."""
        if not self._ai_init_attempted:
            self._ai_init_attempted = True
            try:
                self.ai_translator = AITranslator(max_workers=max_workers)
            except Exception as e:
                logger.error("Failed to initialize AITranslator: %s", e)
                self.ai_translator = None

    def translate(self, text, source_lang, target_lang="zh", mode="google"):
        """
        Translate text using the specified engine.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            mode: Translation engine ("google" or "ai")

        Returns:
            dict with translation result
        """
        if mode == "ai":
            if self.ai_translator and self.ai_translator.is_available():
                result = self.ai_translator.translate(
                    text, source_lang, target_lang
                )
                result["engine"] = "ai"
                return result
            else:
                # Fallback to Google if AI not available
                result = self.google_translator.translate(
                    text, source_lang, target_lang
                )
                result["engine"] = "google"
                result["fallback"] = True
                return result

        result = self.google_translator.translate(text, source_lang, target_lang)
        result["engine"] = "google"
        return result

    def translate_async(
        self, text, source_lang, target_lang="zh", mode="google",
        callback=None,
    ):
        """
        Translate text asynchronously using the specified engine.

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code
            mode: Translation engine ("google" or "ai")
            callback: Function to call with result

        Returns:
            Future object
        """
        if mode == "ai" and self.ai_translator:
            future = self.ai_translator.executor.submit(
                self.translate, text, source_lang, target_lang, mode
            )
        else:
            future = self.google_translator.executor.submit(
                self.translate, text, source_lang, target_lang, mode
            )

        if callback:
            future.add_done_callback(lambda f: callback(f.result()))
        return future

    def get_supported_languages(self):
        """Return list of supported languages."""
        return self.google_translator.get_supported_languages()

    def get_available_engines(self):
        """Return list of available translation engines."""
        engines = [
            {"id": "google", "name": "Google 翻译", "available": True},
        ]
        ai_available = (
            self.ai_translator is not None
            and self.ai_translator.is_available()
        )
        engines.append(
            {"id": "ai", "name": "AI 模型翻译", "available": ai_available}
        )
        return engines

    def shutdown(self):
        """Shutdown all translators."""
        self.google_translator.shutdown()
        if self.ai_translator:
            self.ai_translator.shutdown()
        logger.info("TranslationManager shutdown")
