import Foundation

/// 成就类型
enum AchievementType: String, Codable {
    case streak = "streak"
    case vocab = "vocab"
    case time = "time"
    case special = "special"

    var displayName: String {
        switch self {
        case .streak: return "连续打卡"
        case .vocab: return "词汇里程碑"
        case .time: return "学习时长"
        case .special: return "特殊成就"
        }
    }
}

/// 成就
struct Achievement: Codable, Identifiable {
    let achievementId: String
    let userId: String
    let achievementKey: String
    let achievementName: String
    let achievementType: AchievementType
    let icon: String
    let earnedAt: Date?

    var id: String { achievementId }

    enum CodingKeys: String, CodingKey {
        case achievementId = "id"
        case userId = "user_id"
        case achievementKey = "achievement_key"
        case achievementName = "achievement_name"
        case achievementType = "achievement_type"
        case icon
        case earnedAt = "earned_at"
    }
}

/// 成就定义（预设）
struct AchievementDefinition {
    let key: String
    let name: String
    let type: AchievementType
    let icon: String
    let description: String
    let condition: String

    /// 所有预设成就
    static let allDefinitions: [AchievementDefinition] = [
        // 连续打卡
        AchievementDefinition(key: "streak_3", name: "初露锋芒", type: .streak, icon: "🔥",
                              description: "连续学习3天", condition: "streak >= 3"),
        AchievementDefinition(key: "streak_7", name: "坚持不懈", type: .streak, icon: "🔥",
                              description: "连续学习7天", condition: "streak >= 7"),
        AchievementDefinition(key: "streak_21", name: "习惯养成", type: .streak, icon: "🔥",
                              description: "连续学习21天", condition: "streak >= 21"),
        AchievementDefinition(key: "streak_100", name: "百日精进", type: .streak, icon: "🔥",
                              description: "连续学习100天", condition: "streak >= 100"),
        AchievementDefinition(key: "streak_365", name: "全年无休", type: .streak, icon: "🔥",
                              description: "连续学习365天", condition: "streak >= 365"),
        // 词汇里程碑
        AchievementDefinition(key: "vocab_100", name: "入门学者", type: .vocab, icon: "📗",
                              description: "学习100个单词", condition: "total_learned >= 100"),
        AchievementDefinition(key: "vocab_500", name: "初级学者", type: .vocab, icon: "📘",
                              description: "学习500个单词", condition: "total_learned >= 500"),
        AchievementDefinition(key: "vocab_2000", name: "中级学者", type: .vocab, icon: "📙",
                              description: "学习2000个单词", condition: "total_learned >= 2000"),
        AchievementDefinition(key: "vocab_5000", name: "高级学者", type: .vocab, icon: "📕",
                              description: "学习5000个单词", condition: "total_learned >= 5000"),
        AchievementDefinition(key: "vocab_10000", name: "词汇大师", type: .vocab, icon: "👑",
                              description: "学习10000个单词", condition: "total_learned >= 10000"),
    ]
}
