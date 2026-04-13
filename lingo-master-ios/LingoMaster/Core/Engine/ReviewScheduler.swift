import Foundation

/// 复习调度器 - 管理每日复习队列
class ReviewScheduler {

    /// 每日最大复习量
    static let maxDailyReview = 200

    /// 获取今日复习队列
    /// - Parameters:
    ///   - records: 所有学习记录
    ///   - maxCount: 最大复习数量
    /// - Returns: 今日需要复习的记录
    static func getTodayReviewQueue(
        from records: [LearningRecord],
        maxCount: Int = maxDailyReview
    ) -> [LearningRecord] {
        let queue = SM2Engine.getReviewQueue(from: records)
        return Array(queue.prefix(maxCount))
    }

    /// 获取复习统计信息
    /// - Parameter records: 所有学习记录
    /// - Returns: 复习统计
    static func getReviewStats(from records: [LearningRecord]) -> ReviewStats {
        let today = Calendar.current.startOfDay(for: Date())
        let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today)!
        let nextWeek = Calendar.current.date(byAdding: .day, value: 7, to: today)!

        var dueToday = 0
        var dueTomorrow = 0
        var dueThisWeek = 0
        var overdue = 0

        for record in records {
            guard let nextReview = record.nextReviewDate else { continue }
            let reviewDay = Calendar.current.startOfDay(for: nextReview)

            if reviewDay < today {
                overdue += 1
                dueToday += 1 // 过期的也要今天复习
            } else if reviewDay == today {
                dueToday += 1
            } else if reviewDay == Calendar.current.startOfDay(for: tomorrow) {
                dueTomorrow += 1
            }

            if reviewDay <= nextWeek {
                dueThisWeek += 1
            }
        }

        return ReviewStats(
            dueToday: dueToday,
            dueTomorrow: dueTomorrow,
            dueThisWeek: dueThisWeek,
            overdue: overdue
        )
    }

    /// 估算完成复习所需时间（分钟）
    /// - Parameter count: 复习单词数
    /// - Returns: 预估时间（分钟）
    static func estimateReviewTime(count: Int) -> Int {
        // 平均每个单词约15秒
        return max(1, (count * 15) / 60)
    }
}

/// 复习统计
struct ReviewStats {
    let dueToday: Int
    let dueTomorrow: Int
    let dueThisWeek: Int
    let overdue: Int
}
