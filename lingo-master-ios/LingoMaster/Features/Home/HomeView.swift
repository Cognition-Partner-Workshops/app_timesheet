import SwiftUI

/// 首页视图
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 用户欢迎卡片
                    welcomeCard

                    // 今日任务概览
                    todayTaskCard

                    // 快捷操作
                    quickActions

                    // 学习统计摘要
                    statsCard
                }
                .padding()
            }
            .navigationTitle("LingoMaster")
            .onAppear {
                Task { await viewModel.loadData() }
            }
        }
    }

    // MARK: - 子视图

    private var welcomeCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading) {
                    Text("你好，\(viewModel.userName) 👋")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("今天也要加油哦！")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
                // 连续天数
                VStack {
                    Text("🔥")
                        .font(.title)
                    Text("\(viewModel.streakDays)天")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
            }
        }
        .padding()
        .background(Color.blue.opacity(0.1))
        .cornerRadius(12)
    }

    private var todayTaskCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("今日任务")
                .font(.headline)

            HStack(spacing: 16) {
                // 新词
                taskItem(
                    icon: "book.fill",
                    title: "新词学习",
                    count: viewModel.newWordsDone,
                    target: viewModel.newWordsTarget,
                    color: .blue
                )

                // 复习
                taskItem(
                    icon: "arrow.counterclockwise",
                    title: "复习巩固",
                    count: viewModel.reviewDone,
                    target: viewModel.reviewTarget,
                    color: .green
                )
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func taskItem(icon: String, title: String, count: Int, target: Int, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text("\(count)/\(target)")
                .font(.headline)
                .foregroundColor(count >= target ? .green : .primary)

            ProgressView(value: Double(count), total: Double(max(1, target)))
                .tint(color)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.05))
        .cornerRadius(8)
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("快捷操作")
                .font(.headline)

            HStack(spacing: 12) {
                NavigationLink(destination: Text("学习新词")) {
                    quickActionButton(icon: "plus.circle.fill", title: "学习新词", color: .blue)
                }

                NavigationLink(destination: Text("开始复习")) {
                    quickActionButton(icon: "arrow.clockwise.circle.fill", title: "开始复习", color: .green)
                }

                NavigationLink(destination: Text("词汇测试")) {
                    quickActionButton(icon: "checkmark.circle.fill", title: "词汇测试", color: .orange)
                }

                NavigationLink(destination: Text("AI助手")) {
                    quickActionButton(icon: "brain", title: "AI助手", color: .purple)
                }
            }
        }
    }

    private func quickActionButton(icon: String, title: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            Text(title)
                .font(.caption2)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    private var statsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("学习概览")
                .font(.headline)

            HStack(spacing: 0) {
                statItem(title: "已学单词", value: "\(viewModel.totalLearned)")
                Divider()
                statItem(title: "已掌握", value: "\(viewModel.totalMastered)")
                Divider()
                statItem(title: "今日用时", value: "\(viewModel.todayMinutes)分")
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func statItem(title: String, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.blue)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

/// 首页视图模型
@MainActor
class HomeViewModel: ObservableObject {
    @Published var userName: String = "学习者"
    @Published var streakDays: Int = 0
    @Published var newWordsTarget: Int = 20
    @Published var newWordsDone: Int = 0
    @Published var reviewTarget: Int = 50
    @Published var reviewDone: Int = 0
    @Published var totalLearned: Int = 0
    @Published var totalMastered: Int = 0
    @Published var todayMinutes: Int = 0

    func loadData() async {
        // 从本地数据库或API加载数据
        // 这里先使用默认值
    }
}
