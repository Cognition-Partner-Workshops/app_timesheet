package com.lingomaster.app.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface WordDao {
    @Query("SELECT * FROM cached_words WHERE book_id = :bookId")
    fun getWordsByBook(bookId: String): Flow<List<CachedWord>>

    @Query("SELECT * FROM cached_words WHERE word_id = :wordId")
    suspend fun getWord(wordId: String): CachedWord?

    @Query("SELECT * FROM cached_words WHERE word LIKE '%' || :query || '%'")
    fun searchWords(query: String): Flow<List<CachedWord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWords(words: List<CachedWord>)

    @Query("DELETE FROM cached_words WHERE book_id = :bookId")
    suspend fun deleteWordsByBook(bookId: String)
}

@Dao
interface WordbookDao {
    @Query("SELECT * FROM cached_wordbooks")
    fun getAllWordbooks(): Flow<List<CachedWordbook>>

    @Query("SELECT * FROM cached_wordbooks WHERE language_code = :languageCode")
    fun getWordbooksByLanguage(languageCode: String): Flow<List<CachedWordbook>>

    @Query("SELECT * FROM cached_wordbooks WHERE book_id = :bookId")
    suspend fun getWordbook(bookId: String): CachedWordbook?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWordbooks(wordbooks: List<CachedWordbook>)
}

@Dao
interface LearningDao {
    @Query("SELECT * FROM local_learning_records WHERE book_id = :bookId")
    fun getRecordsByBook(bookId: String): Flow<List<LocalLearningRecord>>

    @Query("SELECT * FROM local_learning_records WHERE word_id = :wordId AND book_id = :bookId")
    suspend fun getRecord(wordId: String, bookId: String): LocalLearningRecord?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: LocalLearningRecord)

    @Query("SELECT * FROM local_learning_records WHERE is_synced = 0")
    suspend fun getUnsyncedRecords(): List<LocalLearningRecord>

    @Query("UPDATE local_learning_records SET is_synced = 1 WHERE id = :id")
    suspend fun markSynced(id: Long)

    @Query("SELECT COUNT(*) FROM local_learning_records WHERE book_id = :bookId")
    suspend fun getLearnedCountForBook(bookId: String): Int

    @Query("SELECT COUNT(*) FROM local_learning_records")
    suspend fun getTotalLearnedCount(): Int
}
