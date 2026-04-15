package com.lingomaster.app.data.model

import com.google.gson.annotations.SerializedName

data class LearningRecord(
    @SerializedName("record_id") val recordId: String?,
    @SerializedName("user_id") val userId: String,
    @SerializedName("word_id") val wordId: String,
    @SerializedName("book_id") val bookId: String,
    @SerializedName("mastery_level") val masteryLevel: Int,
    @SerializedName("ease_factor") val easeFactor: Double,
    @SerializedName("interval_days") val intervalDays: Int,
    @SerializedName("repetition_count") val repetitionCount: Int,
    @SerializedName("next_review_at") val nextReviewAt: String?,
    @SerializedName("last_reviewed_at") val lastReviewedAt: String?
)

data class ReviewSubmission(
    @SerializedName("word_id") val wordId: String,
    @SerializedName("book_id") val bookId: String,
    val quality: Int
)

data class ReviewResult(
    @SerializedName("word_id") val wordId: String,
    @SerializedName("new_mastery_level") val newMasteryLevel: Int,
    @SerializedName("new_ease_factor") val newEaseFactor: Double,
    @SerializedName("new_interval_days") val newIntervalDays: Int,
    @SerializedName("next_review_at") val nextReviewAt: String?
)

data class LearningStats(
    @SerializedName("total_words_learned") val totalWordsLearned: Int,
    @SerializedName("words_mastered") val wordsMastered: Int,
    @SerializedName("words_learning") val wordsLearning: Int,
    @SerializedName("streak_days") val streakDays: Int,
    @SerializedName("total_reviews") val totalReviews: Int,
    @SerializedName("accuracy_rate") val accuracyRate: Double,
    @SerializedName("today_new_words") val todayNewWords: Int,
    @SerializedName("today_reviews") val todayReviews: Int
)
