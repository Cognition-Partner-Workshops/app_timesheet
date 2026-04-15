package com.lingomaster.app.data.db

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.lingomaster.app.data.model.WordMeaning

class Converters {
    private val gson = Gson()

    @TypeConverter
    fun fromMeaningsList(value: List<WordMeaning>?): String? {
        return value?.let { gson.toJson(it) }
    }

    @TypeConverter
    fun toMeaningsList(value: String?): List<WordMeaning>? {
        return value?.let {
            val type = object : TypeToken<List<WordMeaning>>() {}.type
            gson.fromJson(it, type)
        }
    }

    @TypeConverter
    fun fromStringList(value: List<String>?): String? {
        return value?.let { gson.toJson(it) }
    }

    @TypeConverter
    fun toStringList(value: String?): List<String>? {
        return value?.let {
            val type = object : TypeToken<List<String>>() {}.type
            gson.fromJson(it, type)
        }
    }
}
