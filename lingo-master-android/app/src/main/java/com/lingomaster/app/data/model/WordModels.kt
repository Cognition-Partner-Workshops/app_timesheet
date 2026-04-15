package com.lingomaster.app.data.model

import com.google.gson.annotations.SerializedName

data class Language(
    @SerializedName("language_code") val languageCode: String,
    @SerializedName("language_name") val languageName: String,
    @SerializedName("flag_emoji") val flagEmoji: String,
    @SerializedName("is_active") val isActive: Boolean
)

data class WordbookCategory(
    @SerializedName("category_id") val categoryId: Int,
    @SerializedName("language_code") val languageCode: String,
    @SerializedName("category_type") val categoryType: String,
    @SerializedName("category_name") val categoryName: String
)

data class Wordbook(
    @SerializedName("book_id") val bookId: String,
    @SerializedName("language_code") val languageCode: String,
    val name: String,
    val description: String?,
    @SerializedName("word_count") val wordCount: Int,
    val difficulty: Int,
    @SerializedName("is_free") val isFree: Boolean,
    @SerializedName("cover_color") val coverColor: String?,
    val category: WordbookCategory?
)

data class WordMeaning(
    val pos: String,
    @SerializedName("definition_zh") val definitionZh: String,
    @SerializedName("definition_en") val definitionEn: String,
    val example: String?,
    @SerializedName("example_zh") val exampleZh: String?
)

data class Word(
    @SerializedName("word_id") val wordId: String,
    @SerializedName("language_code") val languageCode: String,
    val word: String,
    @SerializedName("phonetic_ipa") val phoneticIpa: String?,
    val meanings: List<WordMeaning>?,
    @SerializedName("frequency_rank") val frequencyRank: Int?,
    @SerializedName("difficulty_level") val difficultyLevel: Int,
    val tags: List<String>?
)

data class PaginatedResponse<T>(
    val items: List<T>,
    val total: Int,
    val page: Int,
    @SerializedName("page_size") val pageSize: Int,
    @SerializedName("total_pages") val totalPages: Int
)
