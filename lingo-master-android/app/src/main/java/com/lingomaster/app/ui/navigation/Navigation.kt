package com.lingomaster.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.lingomaster.app.ui.auth.LoginScreen
import com.lingomaster.app.ui.auth.RegisterScreen
import com.lingomaster.app.ui.auth.AuthViewModel
import com.lingomaster.app.ui.home.HomeScreen
import com.lingomaster.app.ui.wordbook.WordbookListScreen
import com.lingomaster.app.ui.wordbook.WordbookDetailScreen
import com.lingomaster.app.ui.learning.LearningScreen
import com.lingomaster.app.ui.review.ReviewScreen
import com.lingomaster.app.ui.statistics.StatisticsScreen

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object Home : Screen("home")
    data object Wordbooks : Screen("wordbooks")
    data object WordbookDetail : Screen("wordbook/{bookId}") {
        fun createRoute(bookId: String) = "wordbook/$bookId"
    }
    data object Learning : Screen("learning/{bookId}") {
        fun createRoute(bookId: String) = "learning/$bookId"
    }
    data object Review : Screen("review/{bookId}") {
        fun createRoute(bookId: String) = "review/$bookId"
    }
    data object Statistics : Screen("statistics")
}

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val icon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home, "Home", Icons.Filled.Home),
    BottomNavItem(Screen.Wordbooks, "Wordbooks", Icons.Filled.MenuBook),
    BottomNavItem(Screen.Statistics, "Statistics", Icons.Filled.BarChart)
)

@Composable
fun LingoMasterNavHost() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val isLoggedIn by authViewModel.isLoggedIn.collectAsState()

    val startDestination = if (isLoggedIn) Screen.Home.route else Screen.Login.route

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in listOf(
        Screen.Home.route,
        Screen.Wordbooks.route,
        Screen.Statistics.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        NavigationBarItem(
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                            selected = currentRoute == item.screen.route,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateToRegister = {
                        navController.navigate(Screen.Register.route)
                    }
                )
            }
            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Home.route) {
                HomeScreen(navController = navController)
            }
            composable(Screen.Wordbooks.route) {
                WordbookListScreen(navController = navController)
            }
            composable(
                route = Screen.WordbookDetail.route,
                arguments = listOf(navArgument("bookId") { type = NavType.StringType })
            ) { backStackEntry ->
                val bookId = backStackEntry.arguments?.getString("bookId") ?: return@composable
                WordbookDetailScreen(
                    bookId = bookId,
                    navController = navController
                )
            }
            composable(
                route = Screen.Learning.route,
                arguments = listOf(navArgument("bookId") { type = NavType.StringType })
            ) { backStackEntry ->
                val bookId = backStackEntry.arguments?.getString("bookId") ?: return@composable
                LearningScreen(
                    bookId = bookId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(
                route = Screen.Review.route,
                arguments = listOf(navArgument("bookId") { type = NavType.StringType })
            ) { backStackEntry ->
                val bookId = backStackEntry.arguments?.getString("bookId") ?: return@composable
                ReviewScreen(
                    bookId = bookId,
                    onBack = { navController.popBackStack() }
                )
            }
            composable(Screen.Statistics.route) {
                StatisticsScreen()
            }
        }
    }
}
