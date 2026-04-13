import Foundation

/// 复习视图模型 - 管理间隔重复复习流程
@MainActor
class ReviewViewModel: ObservableObject {

    /// 复习卡片状态
    enum CardState {
        case front   // 显示单词
        case back    // 显示释义
    }

    @Published var cardState: CardState = .front
    @Published var currentIndex: Int = 0
    @Published var isPlaying: Bool = false
    @Published var isCompleted: Bool = false
    @Published var sessionStats: SessionStats = SessionStats()

    private var reviewQueue: [(word: Word, record: LearningRecord)] = []
    private let ttsManager = TTSManager.shared

    /// 当前复习的单词
    var currentWord: Word? {
        guard currentIndex < reviewQueue.count else { return nil }
        return reviewQueue[currentIndex].word
    }

    /// 当前记录
    var currentRecord: LearningRecord? {
        guard currentIndex < reviewQueue.count else { return nil }
        return reviewQueue[currentIndex].record
    }

    /// 进度
    var progress: Double {
        guard !reviewQueue.isEmpty else { return 0 }
        return Double(currentIndex) / Double(reviewQueue.count)
    }

    /// 剩余数量
    var remainingCount: Int {
        max(0, reviewQueue.count - currentIndex)
    }

    /// 总数量
    var totalCount: Int {
        reviewQueue.count
    }

    /// 加载复习队列
    func loadReviewQueue(words: [(Word, LearningRecord)]) {
        self.reviewQueue = words.map { ($0.0, $0.1) }
        self.currentIndex = 0
        self.cardState = .front
        self.isCompleted = false
        self.sessionStats = SessionStats()
    }

    /// 翻转卡片
    func flipCard() {
        cardState = cardState == .front ? .back : .front
    }

    /// 播放发音
    func playPronunciation() async {
        guard let word = currentWord else { return }
        isPlaying = true
        await ttsManager.speak(text: word.word, language: word.languageCode)
        isPlaying = false
    }

    /// 评分并前进
    func rate(quality: QualityRating) {
        guard currentIndex < reviewQueue.count else { return }
        var record = reviewQueue[currentIndex].record

        // SM-2 计算
        let result = SM2Engine.calculate(
            quality: quality.rawValue,
            repetitions: record.repetitions,
            easinessFactor: record.easinessFactor,
            intervalDays: record.intervalDays,
            consecutivePerfect: record.consecutivePerfect
        )

        // 更新记录
        record.easinessFactor = result.easinessFactor
        record.repetitions = result.repetitions
        record.intervalDays = result.intervalDays
        record.nextReviewDate = result.nextReviewDate
        record.status = result.status
        record.lastReviewedAt = Date()
        record.updatedAt = Date()
        record.qualityHistory.append(QualityEntry(
            quality: quality.rawValue,
            reviewedAt: Date(),
            interval: result.intervalDays
        ))

        if result.status == .mastered {
            record.masteredAt = Date()
        }

        reviewQueue[currentIndex].record = record

        // 更新统计
        sessionStats.totalReviewed += 1
        if quality.isCorrect {
            sessionStats.correctCount += 1
        } else {
            sessionStats.incorrectCount += 1
        }
        if result.status == .mastered {
            sessionStats.masteredCount += 1
        }

        // 前进到下一个
        moveToNext()
    }

    /// 前进到下一个
    private func moveToNext() {
        currentIndex += 1
        cardState = .front

        if currentIndex >= reviewQueue.count {
            isCompleted = true
        }
    }

    /// 获取更新后的记录列表
    func getUpdatedRecords() -> [LearningRecord] {
        reviewQueue.map { $0.record }
    }
}

/// 复习会话统计
struct SessionStats {
    var totalReviewed: Int = 0
    var correctCount: Int = 0
    var incorrectCount: Int = 0
    var masteredCount: Int = 0

    var passRate: Double {
        guard totalReviewed > 0 else { return 0 }
        return Double(correctCount) / Double(totalReviewed)
    }
}
