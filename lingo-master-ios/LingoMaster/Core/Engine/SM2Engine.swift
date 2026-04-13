import Foundation

/// SM-2 间隔重复算法引擎
/// 基于SuperMemo SM-2算法实现，用于计算复习间隔
class SM2Engine {

    /// SM-2 计算结果
    struct SM2Result {
        let easinessFactor: Double
        let repetitions: Int
        let intervalDays: Int
        let nextReviewDate: Date
        let status: LearningStatus
    }

    /// 默认初始值
    static let defaultEasinessFactor: Double = 2.5
    static let minEasinessFactor: Double = 1.3
    static let masteryThreshold: Int = 5  // 连续完美回答次数达标即掌握

    /// 计算下一次复习参数
    /// - Parameters:
    ///   - quality: 质量评分 (0-5)
    ///   - repetitions: 当前重复次数
    ///   - easinessFactor: 当前简易度因子
    ///   - intervalDays: 当前间隔天数
    ///   - consecutivePerfect: 连续完美回答次数
    /// - Returns: SM2Result 包含新的参数
    static func calculate(
        quality: Int,
        repetitions: Int,
        easinessFactor: Double,
        intervalDays: Int,
        consecutivePerfect: Int
    ) -> SM2Result {
        // 限制quality范围
        let q = max(0, min(5, quality))

        // 计算新的简易度因子
        var newEF = easinessFactor + (0.1 - Double(5 - q) * (0.08 + Double(5 - q) * 0.02))
        newEF = max(minEasinessFactor, newEF)

        var newRepetitions: Int
        var newInterval: Int
        var newConsecutivePerfect = consecutivePerfect

        if q >= 3 {
            // 回答正确
            if repetitions == 0 {
                newInterval = 1
            } else if repetitions == 1 {
                newInterval = 6
            } else {
                newInterval = Int(round(Double(intervalDays) * newEF))
            }
            newRepetitions = repetitions + 1

            // 更新连续完美计数
            if q == 5 {
                newConsecutivePerfect += 1
            } else {
                newConsecutivePerfect = 0
            }
        } else {
            // 回答错误 - 重新开始
            newRepetitions = 0
            newInterval = 1
            newConsecutivePerfect = 0
        }

        // 确保间隔不超过365天
        newInterval = min(365, newInterval)

        // 计算下次复习日期
        let nextDate = Calendar.current.date(
            byAdding: .day,
            value: newInterval,
            to: Date()
        ) ?? Date()

        // 确定状态
        let status: LearningStatus
        if newConsecutivePerfect >= masteryThreshold {
            status = .mastered
        } else if newRepetitions == 0 {
            status = .learning
        } else if newRepetitions <= 2 {
            status = .learning
        } else {
            status = .reviewing
        }

        return SM2Result(
            easinessFactor: newEF,
            repetitions: newRepetitions,
            intervalDays: newInterval,
            nextReviewDate: nextDate,
            status: status
        )
    }

    /// 批量计算复习队列
    /// - Parameter records: 学习记录列表
    /// - Returns: 需要复习的记录列表（按优先级排序）
    static func getReviewQueue(from records: [LearningRecord]) -> [LearningRecord] {
        let today = Calendar.current.startOfDay(for: Date())
        return records
            .filter { record in
                guard let nextReview = record.nextReviewDate else { return false }
                return Calendar.current.startOfDay(for: nextReview) <= today
            }
            .sorted { a, b in
                // 优先级：越久未复习的排在前面
                let dateA = a.nextReviewDate ?? Date.distantPast
                let dateB = b.nextReviewDate ?? Date.distantPast
                return dateA < dateB
            }
    }
}
