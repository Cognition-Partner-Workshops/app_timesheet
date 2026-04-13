import Foundation

/// 学习状态
enum LearningStatus: String, Codable {
    case new = "new"
    case learning = "learning"
    case reviewing = "reviewing"
    case mastered = "mastered"

    var displayName: String {
        switch self {
        case .new: return "新词"
        case .learning: return "学习中"
        case .reviewing: return "复习中"
        case .mastered: return "已掌握"
        }
    }
}

/// SM-2 质量评分
enum QualityRating: Int, Codable, CaseIterable {
    case completeBlackout = 0    // 完全不记得
    case incorrect = 1           // 回答错误但看到答案后觉得记得
    case incorrectEasy = 2       // 回答错误但答案容易记住
    case correctDifficult = 3    // 回答正确但很费力
    case correctHesitation = 4   // 回答正确但有犹豫
    case perfect = 5             // 完美回答

    var displayName: String {
        switch self {
        case .completeBlackout: return "完全不认识"
        case .incorrect: return "依稀记得"
        case .incorrectEasy: return "模糊记忆"
        case .correctDifficult: return "勉强记住"
        case .correctHesitation: return "比较熟悉"
        case .perfect: return "非常熟练"
        }
    }

    var isCorrect: Bool {
        self.rawValue >= 3
    }
}

/// 学习记录
struct LearningRecord: Codable, Identifiable {
    let recordId: String
    var userId: String
    let wordId: String
    // SM-2 参数
    var easinessFactor: Double
    var repetitions: Int
    var intervalDays: Int
    var nextReviewDate: Date?
    var consecutivePerfect: Int
    // 状态
    var status: LearningStatus
    // 历史
    var qualityHistory: [QualityEntry]
    var firstLearnedAt: Date?
    var lastReviewedAt: Date?
    var masteredAt: Date?
    // 同步
    var updatedAt: Date
    var syncVersion: Int

    var id: String { recordId }

    /// 是否需要复习
    var needsReview: Bool {
        guard let nextReview = nextReviewDate else { return false }
        return nextReview <= Date()
    }

    enum CodingKeys: String, CodingKey {
        case recordId = "record_id"
        case userId = "user_id"
        case wordId = "word_id"
        case easinessFactor = "easiness_factor"
        case repetitions
        case intervalDays = "interval_days"
        case nextReviewDate = "next_review_date"
        case consecutivePerfect = "consecutive_perfect"
        case status
        case qualityHistory = "quality_history"
        case firstLearnedAt = "first_learned_at"
        case lastReviewedAt = "last_reviewed_at"
        case masteredAt = "mastered_at"
        case updatedAt = "updated_at"
        case syncVersion = "sync_version"
    }
}

/// 质量评分历史记录条目
struct QualityEntry: Codable {
    let quality: Int
    let reviewedAt: Date
    let interval: Int

    enum CodingKeys: String, CodingKey {
        case quality
        case reviewedAt = "reviewed_at"
        case interval
    }
}
