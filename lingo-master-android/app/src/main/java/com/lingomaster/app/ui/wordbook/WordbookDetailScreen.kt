package com.lingomaster.app.ui.wordbook

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.lingomaster.app.data.model.Word
import com.lingomaster.app.ui.navigation.Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WordbookDetailScreen(
    bookId: String,
    navController: NavController,
    viewModel: WordbookDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(bookId) {
        viewModel.loadWordbook(bookId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.wordbookName) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ExtendedFloatingActionButton(
                    onClick = { navController.navigate(Screen.Review.createRoute(bookId)) },
                    icon = { Icon(Icons.Filled.Refresh, contentDescription = null) },
                    text = { Text("Review") },
                    containerColor = MaterialTheme.colorScheme.secondary
                )
                ExtendedFloatingActionButton(
                    onClick = { navController.navigate(Screen.Learning.createRoute(bookId)) },
                    icon = { Icon(Icons.Filled.PlayArrow, contentDescription = null) },
                    text = { Text("Learn") }
                )
            }
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Info card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("${uiState.words.size} words", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            if (uiState.learnedCount > 0) {
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = { uiState.learnedCount.toFloat() / uiState.words.size.coerceAtLeast(1) },
                                    modifier = Modifier.fillMaxWidth().height(8.dp),
                                )
                                Text(
                                    "${uiState.learnedCount}/${uiState.words.size} learned",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                // Word list
                items(uiState.words) { word ->
                    WordItem(
                        word = word,
                        onSpeak = { viewModel.speak(word.word, word.languageCode) }
                    )
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
fun WordItem(word: Word, onSpeak: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(word.word, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (word.phoneticIpa != null) {
                    Text(word.phoneticIpa, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                word.meanings?.firstOrNull()?.let { meaning ->
                    Text(
                        "${meaning.pos} ${meaning.definitionZh}",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            IconButton(onClick = onSpeak) {
                Icon(Icons.Filled.VolumeUp, contentDescription = "Play pronunciation")
            }
        }
    }
}
