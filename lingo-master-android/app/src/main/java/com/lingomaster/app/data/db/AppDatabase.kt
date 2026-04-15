package com.lingomaster.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [
        CachedWord::class,
        CachedWordbook::class,
        LocalLearningRecord::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun wordDao(): WordDao
    abstract fun wordbookDao(): WordbookDao
    abstract fun learningDao(): LearningDao
}
