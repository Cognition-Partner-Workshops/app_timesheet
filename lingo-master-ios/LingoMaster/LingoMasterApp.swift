import SwiftUI

/// LingoMaster 应用入口
@main
struct LingoMasterApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            if appState.isLoggedIn {
                MainTabView()
                    .environmentObject(appState)
            } else {
                LoginView()
                    .environmentObject(appState)
            }
        }
    }
}

/// 应用全局状态
class AppState: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: UserProfile?
    @Published var selectedLanguage: String = "en"

    struct UserProfile {
        let userId: String
        let nickname: String
        let email: String?
        let experiencePoints: Int
        let streakDays: Int
    }

    func login(accessToken: String, refreshToken: String) {
        APIClient.shared.setTokens(access: accessToken, refresh: refreshToken)
        isLoggedIn = true
    }

    func logout() {
        APIClient.shared.clearTokens()
        isLoggedIn = false
        currentUser = nil
    }
}

/// 主标签页视图
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("首页")
                }

            Text("词库")
                .tabItem {
                    Image(systemName: "books.vertical.fill")
                    Text("词库")
                }

            Text("学习")
                .tabItem {
                    Image(systemName: "brain.head.profile")
                    Text("学习")
                }

            StatisticsView()
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("统计")
                }

            Text("我的")
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("我的")
                }
        }
    }
}

/// 登录视图
struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @State private var account: String = ""
    @State private var password: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Spacer()

                // Logo
                VStack(spacing: 8) {
                    Image(systemName: "book.and.wrench.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    Text("LingoMaster")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    Text("多语种单词记忆学习系统")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // 输入表单
                VStack(spacing: 16) {
                    TextField("邮箱/手机号", text: $account)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)

                    SecureField("密码", text: $password)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal, 32)

                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                // 登录按钮
                Button(action: { Task { await login() } }) {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("登录")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .padding(.horizontal, 32)
                .disabled(isLoading)

                // 注册链接
                Button("还没有账号？立即注册") {
                    // Navigate to registration
                }
                .font(.subheadline)

                Spacer()
            }
        }
    }

    private func login() async {
        isLoading = true
        errorMessage = nil

        // TODO: Implement actual login API call
        // For now, simulate login
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        appState.login(accessToken: "mock_token", refreshToken: "mock_refresh")

        isLoading = false
    }
}
