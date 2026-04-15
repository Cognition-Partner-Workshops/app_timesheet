package com.lingomaster.app.util

import android.content.Context
import android.speech.tts.TextToSpeech
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TTSManager @Inject constructor(
    @ApplicationContext context: Context
) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech = TextToSpeech(context, this)
    private var isInitialized = false

    override fun onInit(status: Int) {
        isInitialized = status == TextToSpeech.SUCCESS
    }

    fun speak(text: String, languageCode: String = "en") {
        if (!isInitialized) return

        val locale = when (languageCode) {
            "en" -> Locale.ENGLISH
            "fr" -> Locale.FRENCH
            "ja" -> Locale.JAPANESE
            "de" -> Locale.GERMAN
            "es" -> Locale("es")
            else -> Locale.ENGLISH
        }

        tts.language = locale
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lingo_tts")
    }

    fun stop() {
        tts.stop()
    }

    fun shutdown() {
        tts.shutdown()
    }
}
