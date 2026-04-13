import Foundation

/// 学习计划状态
enum PlanStatus: String, Codable {
    case active = "active"
    case paused = "paused"
    case completed = "completed"
    case abandoned = "abandoned"

    var displayName: String {
        switch self {
        case .active: return "进行中"
        case .paused: return "已暂停"
        case .completed: return "已完成"
        case .abandoned: return "已放弃"
        }
    }
}

/// 学习计划
struct StudyPlan: Codable, Identifiable {
    let planId: String
    let userId: String
    let bookId: String
    var dailyNewWords: Int
    var playCount: Int
    let startDate: Date
    var targetDate: Date
    var status: PlanStatus
    let createdAt: Date?

    var id: String { planId }

    /// 剩余天数
    var remainingDays: Int {
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: Date(), to: targetDate).day ?? 0
        return max(0, days)
    }

    /// 进度百分比 (基于时间)
    var timeProgress: Double {
        guard let start = Calendar.current.dateComponents([.day], from: startDate, to: targetDate).day,
              start > 0 else { return 0 }
        let elapsed = Calendar.current.dateComponents([.day], from: startDate, to: Date()).day ?? 0
        return min(1.0, Double(elapsed) / Double(start))
    }

    enum CodingKeys: String, CodingKey {
        case planId = "plan_id"
        case userId = "user_id"
        case bookId = "book_id"
        case dailyNewWords = "daily_new_words"
        case playCount = "play_count"
        case startDate = "start_date"
        case targetDate = "target_date"
        case status
        case createdAt = "created_at"
    }
}

/// 每日任务
struct DailyTask: Codable, Identifiable {
    let taskId: String
    let planId: String
    let userId: String
    let taskDate: Date
    let newTarget: Int
    var newDone: Int
    let reviewTarget: Int
    var reviewDone: Int
    var timeSpentSec: Int
    var completionRate: Double

    var id: String { taskId }

    /// 是否完成新词任务
    var isNewWordsDone: Bool {
        newDone >= newTarget
    }

    /// 是否完成复习任务
    var isReviewDone: Bool {
        reviewDone >= reviewTarget
    }

    /// 是否全部完成
    var isCompleted: Bool {
        completionRate >= 1.0
    }

    enum CodingKeys: String, CodingKey {
        case taskId = "task_id"
        case planId = "plan_id"
        case userId = "user_id"
        case taskDate = "task_date"
        case newTarget = "new_target"
        case newDone = "new_done"
        case reviewTarget = "review_target"
        case reviewDone = "review_done"
        case timeSpentSec = "time_spent_sec"
        case completionRate = "completion_rate"
    }
}

/// 每日学习统计
struct DailyStat: Codable, Identifiable {
    let statId: String
    let userId: String
    let statDate: Date
    var newWordsLearned: Int
    var wordsReviewed: Int
    var wordsMastered: Int
    var timeSpentSec: Int
    var reviewPassRate: Double

    var id: String { statId }

    /// 学习时间（分钟）
    var timeSpentMinutes: Double {
        Double(timeSpentSec) / 60.0
    }

    enum CodingKeys: String, CodingKey {
        case statId = "stat_id"
        case userId = "user_id"
        case statDate = "stat_date"
        case newWordsLearned = "new_words_learned"
        case wordsReviewed = "words_reviewed"
        case wordsMastered = "words_mastered"
        case timeSpentSec = "time_spent_sec"
        case reviewPassRate = "review_pass_rate"
    }
}
