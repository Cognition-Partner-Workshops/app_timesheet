import Foundation

/// 词汇量测试引擎 - 自适应词汇量估测
class VocabTestEngine {

    /// 测试配置
    struct TestConfig {
        let totalQuestions: Int       // 总题数
        let frequencyBands: [FrequencyBand]  // 频率分段

        static let defaultConfig = TestConfig(
            totalQuestions: 40,
            frequencyBands: FrequencyBand.defaultBands
        )
    }

    /// 频率分段
    struct FrequencyBand {
        let name: String
        let minRank: Int
        let maxRank: Int
        let sampleSize: Int  // 从这个分段抽取的题数

        static let defaultBands: [FrequencyBand] = [
            FrequencyBand(name: "基础词汇", minRank: 1, maxRank: 2000, sampleSize: 8),
            FrequencyBand(name: "核心词汇", minRank: 2001, maxRank: 5000, sampleSize: 8),
            FrequencyBand(name: "中级词汇", minRank: 5001, maxRank: 10000, sampleSize: 8),
            FrequencyBand(name: "高级词汇", minRank: 10001, maxRank: 20000, sampleSize: 8),
            FrequencyBand(name: "专业词汇", minRank: 20001, maxRank: 50000, sampleSize: 8),
        ]
    }

    /// 测试题目
    struct TestQuestion {
        let word: Word
        let options: [String]  // 4个选项（含正确答案）
        let correctIndex: Int
        let frequencyBand: String
    }

    /// 测试结果
    struct TestResult {
        let estimatedVocabSize: Int
        let bandResults: [BandResult]
        let accuracy: Double
        let recommendedLevel: String

        struct BandResult {
            let bandName: String
            let correct: Int
            let total: Int
            let accuracy: Double
        }
    }

    private var config: TestConfig
    private var questions: [TestQuestion] = []
    private var answers: [(questionIndex: Int, selectedIndex: Int, isCorrect: Bool)] = []
    private var currentIndex: Int = 0

    init(config: TestConfig = .defaultConfig) {
        self.config = config
    }

    /// 生成测试题目
    /// - Parameters:
    ///   - words: 可用的单词池
    ///   - allWords: 所有单词（用于生成干扰项）
    func generateQuestions(from words: [Word], allWords: [Word]) {
        questions = []

        for band in config.frequencyBands {
            // 筛选当前频率段的单词
            let bandWords = words.filter { word in
                guard let rank = word.frequencyRank else { return false }
                return rank >= band.minRank && rank <= band.maxRank
            }

            // 随机抽样
            let sampled = Array(bandWords.shuffled().prefix(band.sampleSize))

            for word in sampled {
                let correctAnswer = word.primaryMeaning
                var options = [correctAnswer]

                // 生成3个干扰选项
                let distractors = allWords
                    .filter { $0.wordId != word.wordId }
                    .shuffled()
                    .prefix(3)
                    .map { $0.primaryMeaning }

                options.append(contentsOf: distractors)
                options.shuffle()

                let correctIndex = options.firstIndex(of: correctAnswer) ?? 0

                questions.append(TestQuestion(
                    word: word,
                    options: options,
                    correctIndex: correctIndex,
                    frequencyBand: band.name
                ))
            }
        }

        questions.shuffle()
        currentIndex = 0
        answers = []
    }

    /// 获取当前题目
    var currentQuestion: TestQuestion? {
        guard currentIndex < questions.count else { return nil }
        return questions[currentIndex]
    }

    /// 回答当前题目
    /// - Parameter selectedIndex: 选择的选项索引
    /// - Returns: 是否回答正确
    @discardableResult
    func answerQuestion(selectedIndex: Int) -> Bool {
        guard currentIndex < questions.count else { return false }
        let question = questions[currentIndex]
        let isCorrect = selectedIndex == question.correctIndex

        answers.append((
            questionIndex: currentIndex,
            selectedIndex: selectedIndex,
            isCorrect: isCorrect
        ))

        currentIndex += 1
        return isCorrect
    }

    /// 计算测试结果
    func calculateResult() -> TestResult {
        var bandResults: [TestResult.BandResult] = []

        for band in config.frequencyBands {
            let bandQuestions = questions.enumerated().filter { $0.element.frequencyBand == band.name }
            let bandAnswers = bandQuestions.compactMap { (index, _) in
                answers.first { $0.questionIndex == index }
            }

            let correct = bandAnswers.filter { $0.isCorrect }.count
            let total = bandQuestions.count

            bandResults.append(TestResult.BandResult(
                bandName: band.name,
                correct: correct,
                total: total,
                accuracy: total > 0 ? Double(correct) / Double(total) : 0
            ))
        }

        // 估算词汇量
        var estimatedVocab = 0
        for (index, band) in config.frequencyBands.enumerated() {
            if index < bandResults.count {
                let bandSize = band.maxRank - band.minRank + 1
                estimatedVocab += Int(Double(bandSize) * bandResults[index].accuracy)
            }
        }

        let totalCorrect = answers.filter { $0.isCorrect }.count
        let totalAccuracy = answers.isEmpty ? 0 : Double(totalCorrect) / Double(answers.count)

        let level: String
        switch estimatedVocab {
        case 0..<2000: level = "初级 (A1-A2)"
        case 2000..<5000: level = "中级 (B1)"
        case 5000..<10000: level = "中高级 (B2)"
        case 10000..<20000: level = "高级 (C1)"
        default: level = "精通 (C2)"
        }

        return TestResult(
            estimatedVocabSize: estimatedVocab,
            bandResults: bandResults,
            accuracy: totalAccuracy,
            recommendedLevel: level
        )
    }

    /// 测试进度
    var progress: Double {
        guard !questions.isEmpty else { return 0 }
        return Double(currentIndex) / Double(questions.count)
    }

    /// 是否测试完成
    var isCompleted: Bool {
        currentIndex >= questions.count
    }
}
