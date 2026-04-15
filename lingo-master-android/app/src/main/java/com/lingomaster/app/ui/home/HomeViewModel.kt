package com.lingomaster.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.model.Language
import com.lingomaster.app.data.model.Wordbook
import com.lingomaster.app.data.repository.AuthRepository
import com.lingomaster.app.data.repository.LearningRepository
import com.lingomaster.app.data.repository.WordRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val totalWordsLearned: Int = 0,
    val streakDays: Int = 0,
    val accuracyRate: Double = 0.0,
    val todayNewWords: Int = 0,
    val todayReviews: Int = 0,
    val languages: List<Language> = emptyList(),
    val wordbooks: List<Wordbook> = emptyList()
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val wordRepository: WordRepository,
    private val learningRepository: LearningRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            // Load languages
            wordRepository.getLanguages().onSuccess { langs ->
                _uiState.value = _uiState.value.copy(languages = langs)
            }

            // Load wordbooks
            wordRepository.getWordbooks().onSuccess { response ->
                _uiState.value = _uiState.value.copy(wordbooks = response.items)
            }

            // Load stats
            learningRepository.getOverview().onSuccess { stats ->
                _uiState.value = _uiState.value.copy(
                    totalWordsLearned = stats.totalWordsLearned,
                    streakDays = stats.streakDays,
                    accuracyRate = stats.accuracyRate,
                    todayNewWords = stats.todayNewWords,
                    todayReviews = stats.todayReviews
                )
            }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun logout() {
        authRepository.logout()
    }
}
