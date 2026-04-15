package com.lingomaster.app.ui.wordbook

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.model.Word
import com.lingomaster.app.data.repository.LearningRepository
import com.lingomaster.app.data.repository.WordRepository
import com.lingomaster.app.util.TTSManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WordbookDetailUiState(
    val isLoading: Boolean = false,
    val wordbookName: String = "",
    val words: List<Word> = emptyList(),
    val learnedCount: Int = 0,
    val error: String? = null
)

@HiltViewModel
class WordbookDetailViewModel @Inject constructor(
    private val wordRepository: WordRepository,
    private val learningRepository: LearningRepository,
    private val ttsManager: TTSManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(WordbookDetailUiState())
    val uiState: StateFlow<WordbookDetailUiState> = _uiState.asStateFlow()

    fun loadWordbook(bookId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            wordRepository.getWordbookWords(bookId).fold(
                onSuccess = { response ->
                    _uiState.value = _uiState.value.copy(
                        words = response.items,
                        isLoading = false
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        error = it.message,
                        isLoading = false
                    )
                }
            )

            val learned = learningRepository.getLearnedCount(bookId)
            _uiState.value = _uiState.value.copy(learnedCount = learned)
        }
    }

    fun speak(text: String, languageCode: String) {
        ttsManager.speak(text, languageCode)
    }
}
