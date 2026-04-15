package com.lingomaster.app.data.db

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_words")
data class CachedWord(
    @PrimaryKey @ColumnInfo(name = "word_id") val wordId: String,
    @ColumnInfo(name = "language_code") val languageCode: String,
    val word: String,
    @ColumnInfo(name = "phonetic_ipa") val phoneticIpa: String?,
    @ColumnInfo(name = "meanings_json") val meaningsJson: String?,
    @ColumnInfo(name = "frequency_rank") val frequencyRank: Int?,
    @ColumnInfo(name = "difficulty_level") val difficultyLevel: Int,
    @ColumnInfo(name = "tags_json") val tagsJson: String?,
    @ColumnInfo(name = "book_id") val bookId: String?
)

@Entity(tableName = "cached_wordbooks")
data class CachedWordbook(
    @PrimaryKey @ColumnInfo(name = "book_id") val bookId: String,
    @ColumnInfo(name = "language_code") val languageCode: String,
    val name: String,
    val description: String?,
    @ColumnInfo(name = "word_count") val wordCount: Int,
    val difficulty: Int,
    @ColumnInfo(name = "is_free") val isFree: Boolean,
    @ColumnInfo(name = "cover_color") val coverColor: String?
)

@Entity(tableName = "local_learning_records")
data class LocalLearningRecord(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "word_id") val wordId: String,
    @ColumnInfo(name = "book_id") val bookId: String,
    @ColumnInfo(name = "mastery_level") val masteryLevel: Int,
    @ColumnInfo(name = "ease_factor") val easeFactor: Double,
    @ColumnInfo(name = "interval_days") val intervalDays: Int,
    @ColumnInfo(name = "repetition_count") val repetitionCount: Int,
    @ColumnInfo(name = "next_review_at") val nextReviewAt: Long?,
    @ColumnInfo(name = "last_reviewed_at") val lastReviewedAt: Long?,
    @ColumnInfo(name = "is_synced") val isSynced: Boolean = false
)
