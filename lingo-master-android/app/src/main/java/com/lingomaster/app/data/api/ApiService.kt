package com.lingomaster.app.data.api

import com.lingomaster.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("users/me")
    suspend fun getProfile(): Response<UserProfile>

    @PUT("users/me")
    suspend fun updateProfile(@Body profile: Map<String, @JvmSuppressWildcards Any>): Response<UserProfile>

    @GET("languages")
    suspend fun getLanguages(): Response<List<Language>>

    @GET("languages/{code}/categories")
    suspend fun getCategories(@Path("code") languageCode: String): Response<List<WordbookCategory>>

    @GET("wordbooks")
    suspend fun getWordbooks(
        @Query("language_code") languageCode: String? = null,
        @Query("category_id") categoryId: Int? = null,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20
    ): Response<PaginatedResponse<Wordbook>>

    @GET("wordbooks/{bookId}")
    suspend fun getWordbook(@Path("bookId") bookId: String): Response<Wordbook>

    @GET("wordbooks/{bookId}/words")
    suspend fun getWordbookWords(
        @Path("bookId") bookId: String,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50
    ): Response<PaginatedResponse<Word>>

    @GET("words/{wordId}")
    suspend fun getWord(@Path("wordId") wordId: String): Response<Word>

    @GET("words/search")
    suspend fun searchWords(
        @Query("q") query: String,
        @Query("language_code") languageCode: String? = null
    ): Response<PaginatedResponse<Word>>

    @GET("learning/records")
    suspend fun getLearningRecords(
        @Query("book_id") bookId: String? = null
    ): Response<List<LearningRecord>>

    @POST("learning/review")
    suspend fun submitReview(@Body submission: ReviewSubmission): Response<ReviewResult>

    @GET("learning/due-words")
    suspend fun getDueWords(
        @Query("book_id") bookId: String,
        @Query("limit") limit: Int = 20
    ): Response<List<Word>>

    @GET("learning/new-words")
    suspend fun getNewWords(
        @Query("book_id") bookId: String,
        @Query("limit") limit: Int = 10
    ): Response<List<Word>>

    @GET("analytics/overview")
    suspend fun getOverview(): Response<LearningStats>
}
