package com.lingomaster.app.ui.review

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

data class ReviewUiState(
    val isLoading: Boolean = false,
    val words: List<Word> = emptyList(),
    val currentIndex: Int = 0,
    val showAnswer: Boolean = false,
    val isComplete: Boolean = false,
    val correctCount: Int = 0
)

@HiltViewModel
class ReviewViewModel @Inject constructor(
    private val learningRepository: LearningRepository,
    private val ttsManager: TTSManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReviewUiState())
    val uiState: StateFlow<ReviewUiState> = _uiState.asStateFlow()
    private var currentBookId: String = ""

    fun loadDueWords(bookId: String) {
        currentBookId = bookId
        viewModelScope.launch {
            _uiState.value = ReviewUiState(isLoading = true)
            learningRepository.getDueWords(bookId).fold(
                onSuccess = { words ->
                    _uiState.value = ReviewUiState(words = words)
                },
                onFailure = {
                    _uiState.value = ReviewUiState()
                }
            )
        }
    }

    fun showAnswer() {
        _uiState.value = _uiState.value.copy(showAnswer = true)
    }

    fun rateWord(quality: Int) {
        val state = _uiState.value
        if (state.words.isEmpty()) return

        val word = state.words[state.currentIndex]
        val isCorrect = quality >= 3

        viewModelScope.launch {
            learningRepository.submitReview(word.wordId, currentBookId, quality)
        }

        if (state.currentIndex + 1 >= state.words.size) {
            _uiState.value = state.copy(
                isComplete = true,
                correctCount = state.correctCount + if (isCorrect) 1 else 0
            )
        } else {
            _uiState.value = state.copy(
                currentIndex = state.currentIndex + 1,
                showAnswer = false,
                correctCount = state.correctCount + if (isCorrect) 1 else 0
            )
        }
    }

    fun speak(text: String, languageCode: String) {
        ttsManager.speak(text, languageCode)
    }
}
