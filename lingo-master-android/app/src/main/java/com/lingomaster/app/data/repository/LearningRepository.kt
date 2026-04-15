package com.lingomaster.app.data.repository

import com.lingomaster.app.data.api.ApiService
import com.lingomaster.app.data.db.LearningDao
import com.lingomaster.app.data.db.LocalLearningRecord
import com.lingomaster.app.data.model.*
import com.lingomaster.app.util.SM2Algorithm
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LearningRepository @Inject constructor(
    private val apiService: ApiService,
    private val learningDao: LearningDao
) {
    suspend fun getDueWords(bookId: String, limit: Int = 20): Result<List<Word>> {
        return try {
            val response = apiService.getDueWords(bookId, limit)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNewWords(bookId: String, limit: Int = 10): Result<List<Word>> {
        return try {
            val response = apiService.getNewWords(bookId, limit)
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitReview(wordId: String, bookId: String, quality: Int): Result<ReviewResult> {
        return try {
            val response = apiService.submitReview(ReviewSubmission(wordId, bookId, quality))
            if (response.isSuccessful) {
                val result = response.body()!!
                // Update local record
                val sm2 = SM2Algorithm.calculate(quality,
                    learningDao.getRecord(wordId, bookId)?.repetitionCount ?: 0,
                    learningDao.getRecord(wordId, bookId)?.easeFactor ?: 2.5,
                    learningDao.getRecord(wordId, bookId)?.intervalDays ?: 0
                )
                learningDao.insertRecord(
                    LocalLearningRecord(
                        wordId = wordId,
                        bookId = bookId,
                        masteryLevel = result.newMasteryLevel,
                        easeFactor = result.newEaseFactor,
                        intervalDays = result.newIntervalDays,
                        repetitionCount = sm2.repetitions,
                        nextReviewAt = System.currentTimeMillis() + (result.newIntervalDays * 86400000L),
                        lastReviewedAt = System.currentTimeMillis(),
                        isSynced = true
                    )
                )
                Result.success(result)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getOverview(): Result<LearningStats> {
        return try {
            val response = apiService.getOverview()
            if (response.isSuccessful) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getLocalRecords(bookId: String): Flow<List<LocalLearningRecord>> {
        return learningDao.getRecordsByBook(bookId)
    }

    suspend fun getLearnedCount(bookId: String): Int {
        return learningDao.getLearnedCountForBook(bookId)
    }

    suspend fun getTotalLearnedCount(): Int {
        return learningDao.getTotalLearnedCount()
    }
}
