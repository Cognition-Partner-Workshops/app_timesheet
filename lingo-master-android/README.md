# LingoMaster Android

Multi-language vocabulary learning app built with Kotlin + Jetpack Compose.

## Features

- **Authentication**: Register/Login with JWT tokens
- **Multi-language Support**: English, French, Japanese, German, Spanish
- **Wordbook Browsing**: Browse wordbooks by language, view word details
- **Learning Mode**: Learn new words with flashcard-style interface
- **Review Mode**: SM-2 spaced repetition algorithm for efficient review
- **Statistics**: Track learning progress, streaks, and accuracy
- **TTS**: Text-to-speech pronunciation for all languages
- **Offline Support**: Room database caching for offline access

## Tech Stack

- **Language**: Kotlin 1.9+
- **UI**: Jetpack Compose + Material 3
- **Architecture**: MVVM + Repository pattern
- **DI**: Hilt (Dagger)
- **Network**: Retrofit + OkHttp
- **Local DB**: Room
- **Navigation**: Jetpack Navigation Compose

## Setup

1. Open the project in Android Studio (Hedgehog or later)
2. Sync Gradle dependencies
3. Configure the backend URL in `app/build.gradle.kts`:
   ```kotlin
   buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:8080/api/v1\"")
   ```
   - `10.0.2.2` is the Android emulator's alias for `localhost`
   - Change to your server IP for physical devices

4. Start the backend server:
   ```bash
   cd ../lingo-master-server
   pip install -e ".[test]"
   DATABASE_URL="sqlite+aiosqlite:///./local.db" python scripts/seed_data.py
   DATABASE_URL="sqlite+aiosqlite:///./local.db" python -m uvicorn api.main:app --port 8080
   ```

5. Run the app on an emulator or device

## Project Structure

```
app/src/main/java/com/lingomaster/app/
├── LingoMasterApp.kt          # Application class (Hilt)
├── MainActivity.kt            # Single activity entry point
├── data/
│   ├── api/                   # Retrofit API service + interceptors
│   ├── db/                    # Room database, DAOs, entities
│   ├── model/                 # Data models (API DTOs)
│   └── repository/            # Repository implementations
├── di/                        # Hilt dependency injection modules
├── ui/
│   ├── auth/                  # Login & Register screens
│   ├── home/                  # Home dashboard
│   ├── wordbook/              # Wordbook list & detail
│   ├── learning/              # New word learning
│   ├── review/                # Spaced repetition review
│   ├── statistics/            # Learning statistics
│   ├── navigation/            # Navigation graph
│   └── theme/                 # Material 3 theme
└── util/
    ├── SM2Algorithm.kt        # SM-2 spaced repetition
    ├── TokenManager.kt        # JWT token management
    └── TTSManager.kt          # Text-to-speech
```
