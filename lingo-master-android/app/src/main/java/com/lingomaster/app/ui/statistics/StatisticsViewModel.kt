package com.lingomaster.app.ui.statistics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.repository.LearningRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StatisticsUiState(
    val isLoading: Boolean = false,
    val totalWordsLearned: Int = 0,
    val wordsMastered: Int = 0,
    val wordsLearning: Int = 0,
    val streakDays: Int = 0,
    val totalReviews: Int = 0,
    val accuracyRate: Double = 0.0,
    val todayNewWords: Int = 0,
    val todayReviews: Int = 0
)

@HiltViewModel
class StatisticsViewModel @Inject constructor(
    private val learningRepository: LearningRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(StatisticsUiState())
    val uiState: StateFlow<StatisticsUiState> = _uiState.asStateFlow()

    fun loadStats() {
        viewModelScope.launch {
            _uiState.value = StatisticsUiState(isLoading = true)
            learningRepository.getOverview().fold(
                onSuccess = { stats ->
                    _uiState.value = StatisticsUiState(
                        totalWordsLearned = stats.totalWordsLearned,
                        wordsMastered = stats.wordsMastered,
                        wordsLearning = stats.wordsLearning,
                        streakDays = stats.streakDays,
                        totalReviews = stats.totalReviews,
                        accuracyRate = stats.accuracyRate,
                        todayNewWords = stats.todayNewWords,
                        todayReviews = stats.todayReviews
                    )
                },
                onFailure = {
                    _uiState.value = StatisticsUiState()
                }
            )
        }
    }
}
