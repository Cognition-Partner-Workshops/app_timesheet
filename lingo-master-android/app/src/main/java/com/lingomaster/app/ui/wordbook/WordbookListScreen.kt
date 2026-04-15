package com.lingomaster.app.ui.wordbook

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.lingomaster.app.data.model.Language
import com.lingomaster.app.data.model.Wordbook
import com.lingomaster.app.ui.navigation.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordbookListScreen(
    navController: NavController,
    viewModel: WordbookViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Wordbooks", fontWeight = FontWeight.Bold) })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Language filter chips
            if (uiState.languages.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(vertical = 8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = uiState.selectedLanguage == null,
                            onClick = { viewModel.filterByLanguage(null) },
                            label = { Text("All") }
                        )
                    }
                    items(uiState.languages) { lang ->
                        FilterChip(
                            selected = uiState.selectedLanguage == lang.languageCode,
                            onClick = { viewModel.filterByLanguage(lang.languageCode) },
                            label = { Text("${lang.flagEmoji} ${lang.languageName}") }
                        )
                    }
                }
            }

            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(uiState.wordbooks) { wb ->
                        WordbookCard(
                            wordbook = wb,
                            onClick = { navController.navigate(Screen.WordbookDetail.createRoute(wb.bookId)) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WordbookCard(wordbook: Wordbook, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        try { Color(android.graphics.Color.parseColor(wordbook.coverColor ?: "#4A90D9")) }
                        catch (e: Exception) { Color(0xFF4A90D9) }
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Filled.MenuBook,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(wordbook.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (wordbook.description != null) {
                    Text(
                        wordbook.description,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("${wordbook.wordCount} words", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    DifficultyIndicator(wordbook.difficulty)
                }
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun DifficultyIndicator(level: Int) {
    val (text, color) = when (level) {
        1 -> "Easy" to Color(0xFF43A047)
        2 -> "Medium" to Color(0xFFFFA726)
        3 -> "Hard" to Color(0xFFE53935)
        4 -> "Expert" to Color(0xFF7B1FA2)
        else -> "Unknown" to Color.Gray
    }
    Text(text, fontSize = 12.sp, color = color, fontWeight = FontWeight.Medium)
}
