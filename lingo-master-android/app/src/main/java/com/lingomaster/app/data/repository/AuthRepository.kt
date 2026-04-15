package com.lingomaster.app.data.repository

import com.lingomaster.app.data.api.ApiService
import com.lingomaster.app.data.model.*
import com.lingomaster.app.util.TokenManager
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) {
    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenManager.saveToken(body.accessToken)
                tokenManager.saveUserId(body.userId)
                Result.success(body)
            } else {
                Result.failure(Exception("Login failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(email: String, password: String, nickname: String): Result<AuthResponse> {
        return try {
            val response = apiService.register(RegisterRequest(email, password, nickname))
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenManager.saveToken(body.accessToken)
                tokenManager.saveUserId(body.userId)
                Result.success(body)
            } else {
                Result.failure(Exception("Registration failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProfile(): Result<UserProfile> {
        return try {
            val response = apiService.getProfile()
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to get profile: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun isLoggedIn(): Boolean = tokenManager.getToken() != null

    fun logout() {
        tokenManager.clearAll()
    }
}
