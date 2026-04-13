import Foundation

/// 学习视图模型 - 管理新词学习流程
@MainActor
class LearningViewModel: ObservableObject {

    /// 学习状态
    enum LearningState {
        case loading
        case ready
        case learning(Word)
        case rating(Word)
        case completed
        case error(String)
    }

    @Published var state: LearningState = .loading
    @Published var currentWordIndex: Int = 0
    @Published var playCount: Int = 0
    @Published var isPlaying: Bool = false
    @Published var showMeaning: Bool = false
    @Published var memoryAid: AIMemoryAid?

    private var words: [Word] = []
    private let ttsManager = TTSManager.shared
    private let sm2Engine = SM2Engine.self
    private var totalPlayTarget: Int = 3
    private var learningRecords: [String: LearningRecord] = [:]

    /// 当前单词
    var currentWord: Word? {
        guard currentWordIndex < words.count else { return nil }
        return words[currentWordIndex]
    }

    /// 进度
    var progress: Double {
        guard !words.isEmpty else { return 0 }
        return Double(currentWordIndex) / Double(words.count)
    }

    /// 剩余单词数
    var remainingCount: Int {
        max(0, words.count - currentWordIndex)
    }

    /// 总单词数
    var totalCount: Int {
        words.count
    }

    /// 加载学习列表
    func loadWords(_ wordList: [Word], playCount: Int = 3) {
        self.words = wordList
        self.totalPlayTarget = playCount
        self.currentWordIndex = 0
        self.playCount = 0

        if words.isEmpty {
            state = .completed
        } else {
            state = .learning(words[0])
        }
    }

    /// 播放当前单词发音
    func playPronunciation() async {
        guard let word = currentWord else { return }
        isPlaying = true
        await ttsManager.speak(text: word.word, language: word.languageCode)
        playCount += 1
        isPlaying = false
    }

    /// 自动播放（多次）
    func autoPlay() async {
        for i in 0..<totalPlayTarget {
            if i > 0 {
                try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5秒间隔
            }
            await playPronunciation()
        }
    }

    /// 显示释义
    func revealMeaning() {
        showMeaning = true
    }

    /// 进入评分阶段
    func enterRating() {
        guard let word = currentWord else { return }
        state = .rating(word)
    }

    /// 评分并前进到下一个词
    func rateAndNext(quality: QualityRating) {
        guard let word = currentWord else { return }

        // 获取或创建学习记录
        var record = learningRecords[word.wordId] ?? LearningRecord(
            recordId: UUID().uuidString,
            userId: "",
            wordId: word.wordId,
            easinessFactor: SM2Engine.defaultEasinessFactor,
            repetitions: 0,
            intervalDays: 0,
            nextReviewDate: nil,
            consecutivePerfect: 0,
            status: .new,
            qualityHistory: [],
            firstLearnedAt: Date(),
            lastReviewedAt: nil,
            masteredAt: nil,
            updatedAt: Date(),
            syncVersion: 1
        )

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

        learningRecords[word.wordId] = record

        // 前进到下一个词
        moveToNext()
    }

    /// 前进到下一个单词
    private func moveToNext() {
        currentWordIndex += 1
        playCount = 0
        showMeaning = false
        memoryAid = nil

        if currentWordIndex < words.count {
            state = .learning(words[currentWordIndex])
        } else {
            state = .completed
        }
    }

    /// 获取学习结果摘要
    func getLearningResults() -> LearningResults {
        let records = Array(learningRecords.values)
        let mastered = records.filter { $0.status == .mastered }.count
        let learning = records.filter { $0.status == .learning }.count
        let reviewing = records.filter { $0.status == .reviewing }.count

        return LearningResults(
            totalWords: words.count,
            masteredCount: mastered,
            learningCount: learning,
            reviewingCount: reviewing,
            records: records
        )
    }
}

/// 学习结果汇总
struct LearningResults {
    let totalWords: Int
    let masteredCount: Int
    let learningCount: Int
    let reviewingCount: Int
    let records: [LearningRecord]
}
