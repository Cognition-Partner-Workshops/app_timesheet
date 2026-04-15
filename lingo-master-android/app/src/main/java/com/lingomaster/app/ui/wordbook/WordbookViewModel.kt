package com.lingomaster.app.ui.wordbook

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.model.Language
import com.lingomaster.app.data.model.Wordbook
import com.lingomaster.app.data.repository.WordRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WordbookListUiState(
    val isLoading: Boolean = false,
    val languages: List<Language> = emptyList(),
    val wordbooks: List<Wordbook> = emptyList(),
    val selectedLanguage: String? = null,
    val error: String? = null
)

@HiltViewModel
class WordbookViewModel @Inject constructor(
    private val wordRepository: WordRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WordbookListUiState())
    val uiState: StateFlow<WordbookListUiState> = _uiState.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            wordRepository.getLanguages().onSuccess { langs ->
                _uiState.value = _uiState.value.copy(languages = langs)
            }

            loadWordbooks()
        }
    }

    fun filterByLanguage(languageCode: String?) {
        _uiState.value = _uiState.value.copy(selectedLanguage = languageCode)
        viewModelScope.launch { loadWordbooks() }
    }

    private suspend fun loadWordbooks() {
        _uiState.value = _uiState.value.copy(isLoading = true)
        wordRepository.getWordbooks(languageCode = _uiState.value.selectedLanguage).fold(
            onSuccess = { response ->
                _uiState.value = _uiState.value.copy(
                    wordbooks = response.items,
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
    }
}
