import Foundation

/// AI记忆辅助信息
struct AIMemoryAid: Codable {
    let wordId: String
    let harmonic: String?         // 谐音记忆
    let morphology: Morphology?   // 词形分析
    let story: String?            // 联想故事
    let relatedWords: [String]    // 相关词
    let commonPhrases: [String]   // 常用搭配
    let memoryTip: String?        // 记忆技巧
    let cached: Bool              // 是否缓存命中

    struct Morphology: Codable {
        let prefix: String?
        let root: String?
        let suffix: String?
        let explanation: String?
    }

    enum CodingKeys: String, CodingKey {
        case wordId = "word_id"
        case harmonic, morphology, story
        case relatedWords = "related_words"
        case commonPhrases = "common_phrases"
        case memoryTip = "memory_tip"
        case cached
    }
}

/// AI学习分析报告
struct AnalysisReport: Codable {
    let summary: String
    let efficiencyScore: Int
    let strengths: [String]
    let weaknesses: [String]
    let suggestions: [String]
    let nextWeekFocus: String
    let generatedAt: String?

    enum CodingKeys: String, CodingKey {
        case summary
        case efficiencyScore = "efficiency_score"
        case strengths, weaknesses, suggestions
        case nextWeekFocus = "next_week_focus"
        case generatedAt = "generated_at"
    }
}
