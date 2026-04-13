import SwiftUI

/// 统计视图
struct StatisticsView: View {
    @StateObject private var viewModel = StatisticsViewModel()

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // 总览卡片
                    overviewCard

                    // 日历热力图
                    calendarHeatmap

                    // 趋势图表
                    trendSection

                    // 成就列表
                    achievementsSection
                }
                .padding()
            }
            .navigationTitle("学习统计")
            .onAppear {
                Task { await viewModel.loadStats() }
            }
        }
    }

    private var overviewCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 0) {
                statBox(title: "总词汇量", value: "\(viewModel.totalWords)", icon: "book.fill", color: .blue)
                statBox(title: "已掌握", value: "\(viewModel.masteredWords)", icon: "checkmark.seal.fill", color: .green)
                statBox(title: "学习中", value: "\(viewModel.learningWords)", icon: "pencil", color: .orange)
                statBox(title: "总时长", value: "\(viewModel.totalHours)h", icon: "clock.fill", color: .purple)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func statBox(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private var calendarHeatmap: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("学习日历")
                .font(.headline)

            // 简化的热力图展示
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 2) {
                ForEach(viewModel.calendarData, id: \.date) { day in
                    Rectangle()
                        .fill(heatmapColor(for: day.intensity))
                        .frame(height: 16)
                        .cornerRadius(2)
                }
            }

            // 图例
            HStack(spacing: 4) {
                Text("少")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                ForEach(0..<5) { level in
                    Rectangle()
                        .fill(heatmapColor(for: Double(level) / 4.0))
                        .frame(width: 12, height: 12)
                        .cornerRadius(2)
                }
                Text("多")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func heatmapColor(for intensity: Double) -> Color {
        if intensity <= 0 {
            return Color(.systemGray5)
        }
        return Color.green.opacity(0.2 + intensity * 0.8)
    }

    private var trendSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("学习趋势")
                .font(.headline)

            // 简化的趋势展示
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(viewModel.weeklyData, id: \.day) { data in
                    VStack(spacing: 4) {
                        Rectangle()
                            .fill(Color.blue)
                            .frame(width: 30, height: max(4, CGFloat(data.count) * 2))
                        Text(data.day)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private var achievementsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("成就")
                    .font(.headline)
                Spacer()
                Text("\(viewModel.achievements.count)个")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            ForEach(viewModel.achievements, id: \.key) { achievement in
                HStack(spacing: 12) {
                    Text(achievement.icon)
                        .font(.title2)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(achievement.name)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text(achievement.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    if achievement.earned {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    } else {
                        Image(systemName: "circle")
                            .foregroundColor(.gray)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

/// 统计视图模型
@MainActor
class StatisticsViewModel: ObservableObject {
    @Published var totalWords: Int = 0
    @Published var masteredWords: Int = 0
    @Published var learningWords: Int = 0
    @Published var totalHours: Int = 0
    @Published var calendarData: [CalendarDay] = []
    @Published var weeklyData: [WeeklyDataPoint] = []
    @Published var achievements: [AchievementItem] = []

    struct CalendarDay {
        let date: Date
        let intensity: Double // 0.0 - 1.0
    }

    struct WeeklyDataPoint {
        let day: String
        let count: Int
    }

    struct AchievementItem {
        let key: String
        let name: String
        let icon: String
        let description: String
        let earned: Bool
    }

    func loadStats() async {
        // 生成示例数据
        let days = ["一", "二", "三", "四", "五", "六", "日"]
        weeklyData = days.map { WeeklyDataPoint(day: $0, count: Int.random(in: 5...50)) }

        // 生成日历数据（30天）
        calendarData = (0..<30).map { i in
            CalendarDay(
                date: Calendar.current.date(byAdding: .day, value: -i, to: Date())!,
                intensity: Double.random(in: 0...1)
            )
        }

        // 成就列表
        achievements = AchievementDefinition.allDefinitions.map { def in
            AchievementItem(
                key: def.key,
                name: def.name,
                icon: def.icon,
                description: def.description,
                earned: false
            )
        }
    }
}
