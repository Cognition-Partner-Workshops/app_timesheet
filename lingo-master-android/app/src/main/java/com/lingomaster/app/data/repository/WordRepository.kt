package com.lingomaster.app.data.repository

import com.lingomaster.app.data.api.ApiService
import com.lingomaster.app.data.db.*
import com.lingomaster.app.data.model.*
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WordRepository @Inject constructor(
    private val apiService: ApiService,
    private val wordDao: WordDao,
    private val wordbookDao: WordbookDao,
    private val gson: Gson
) {
    suspend fun getLanguages(): Result<List<Language>> {
        return try {
            val response = apiService.getLanguages()
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWordbooks(languageCode: String? = null, page: Int = 1): Result<PaginatedResponse<Wordbook>> {
        return try {
            val response = apiService.getWordbooks(languageCode = languageCode, page = page)
            if (response.isSuccessful) {
                val data = response.body()!!
                // Cache wordbooks locally
                val cached = data.items.map { wb ->
                    CachedWordbook(
                        bookId = wb.bookId,
                        languageCode = wb.languageCode,
                        name = wb.name,
                        description = wb.description,
                        wordCount = wb.wordCount,
                        difficulty = wb.difficulty,
                        isFree = wb.isFree,
                        coverColor = wb.coverColor
                    )
                }
                wordbookDao.insertWordbooks(cached)
                Result.success(data)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWordbookWords(bookId: String, page: Int = 1): Result<PaginatedResponse<Word>> {
        return try {
            val response = apiService.getWordbookWords(bookId, page)
            if (response.isSuccessful) {
                val data = response.body()!!
                // Cache words locally
                val cached = data.items.map { w ->
                    CachedWord(
                        wordId = w.wordId,
                        languageCode = w.languageCode,
                        word = w.word,
                        phoneticIpa = w.phoneticIpa,
                        meaningsJson = w.meanings?.let { gson.toJson(it) },
                        frequencyRank = w.frequencyRank,
                        difficultyLevel = w.difficultyLevel,
                        tagsJson = w.tags?.let { gson.toJson(it) },
                        bookId = bookId
                    )
                }
                wordDao.insertWords(cached)
                Result.success(data)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun searchWords(query: String): Result<PaginatedResponse<Word>> {
        return try {
            val response = apiService.searchWords(query)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getCachedWordsByBook(bookId: String): Flow<List<CachedWord>> {
        return wordDao.getWordsByBook(bookId)
    }

    fun getCachedWordbooks(): Flow<List<CachedWordbook>> {
        return wordbookDao.getAllWordbooks()
    }
}
