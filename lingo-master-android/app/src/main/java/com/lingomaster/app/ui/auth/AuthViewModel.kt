package com.lingomaster.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lingomaster.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(authRepository.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            val result = authRepository.login(email, password)
            result.fold(
                onSuccess = {
                    _uiState.value = AuthUiState(isSuccess = true)
                    _isLoggedIn.value = true
                },
                onFailure = {
                    _uiState.value = AuthUiState(error = it.message ?: "Login failed")
                }
            )
        }
    }

    fun register(email: String, password: String, nickname: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(isLoading = true)
            val result = authRepository.register(email, password, nickname)
            result.fold(
                onSuccess = {
                    _uiState.value = AuthUiState(isSuccess = true)
                    _isLoggedIn.value = true
                },
                onFailure = {
                    _uiState.value = AuthUiState(error = it.message ?: "Registration failed")
                }
            )
        }
    }

    fun logout() {
        authRepository.logout()
        _isLoggedIn.value = false
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
