package com.lingomaster.app.ui.learning

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.model.Word
import com.lingomaster.app.data.repository.LearningRepository
import com.lingomaster.app.util.TTSManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LearningUiState(
    val isLoading: Boolean = false,
    val words: List<Word> = emptyList(),
    val currentIndex: Int = 0,
    val showMeaning: Boolean = false,
    val isComplete: Boolean = false
)

@HiltViewModel
class LearningViewModel @Inject constructor(
    private val learningRepository: LearningRepository,
    private val ttsManager: TTSManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(LearningUiState())
    val uiState: StateFlow<LearningUiState> = _uiState.asStateFlow()
    private var currentBookId: String = ""

    fun loadNewWords(bookId: String) {
        currentBookId = bookId
        viewModelScope.launch {
            _uiState.value = LearningUiState(isLoading = true)
            learningRepository.getNewWords(bookId).fold(
                onSuccess = { words ->
                    _uiState.value = LearningUiState(words = words)
                },
                onFailure = {
                    _uiState.value = LearningUiState()
                }
            )
        }
    }

    fun showMeaning() {
        _uiState.value = _uiState.value.copy(showMeaning = true)
    }

    fun markWord(quality: Int) {
        val state = _uiState.value
        if (state.words.isEmpty()) return

        val word = state.words[state.currentIndex]
        viewModelScope.launch {
            learningRepository.submitReview(word.wordId, currentBookId, quality)
        }

        if (state.currentIndex + 1 >= state.words.size) {
            _uiState.value = state.copy(isComplete = true)
        } else {
            _uiState.value = state.copy(
                currentIndex = state.currentIndex + 1,
                showMeaning = false
            )
        }
    }

    fun speak(text: String, languageCode: String) {
        ttsManager.speak(text, languageCode)
    }
}
