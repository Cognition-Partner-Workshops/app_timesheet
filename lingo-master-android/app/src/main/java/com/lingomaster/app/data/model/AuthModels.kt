package com.lingomaster.app.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val email: String,
    val password: String,
    val nickname: String,
    @SerializedName("native_language") val nativeLanguage: String = "zh"
)

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("token_type") val tokenType: String,
    @SerializedName("user_id") val userId: String
)

data class UserProfile(
    @SerializedName("user_id") val userId: String,
    val email: String,
    val nickname: String,
    @SerializedName("avatar_url") val avatarUrl: String?,
    @SerializedName("native_language") val nativeLanguage: String,
    @SerializedName("learning_languages") val learningLanguages: List<String>?,
    @SerializedName("daily_goal") val dailyGoal: Int,
    @SerializedName("created_at") val createdAt: String?
)
