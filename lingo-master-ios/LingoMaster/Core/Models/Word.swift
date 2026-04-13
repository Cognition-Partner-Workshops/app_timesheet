import Foundation

/// 单词释义
struct WordMeaning: Codable, Hashable {
    let pos: String           // 词性
    let definitionZh: String  // 中文释义
    let definitionEn: String? // 英文释义
    let example: String?      // 例句
    let exampleZh: String?    // 例句翻译

    enum CodingKeys: String, CodingKey {
        case pos
        case definitionZh = "definition_zh"
        case definitionEn = "definition_en"
        case example
        case exampleZh = "example_zh"
    }
}

/// 词族信息
struct WordFamily: Codable, Hashable {
    let root: String?
    let prefix: String?
    let suffix: String?
    let etymology: String?
    let related: [String]?
}

/// 单词模型
struct Word: Codable, Identifiable, Hashable {
    let wordId: String
    let languageCode: String
    let word: String
    let phoneticIpa: String?
    let meanings: [WordMeaning]
    let wordFamily: WordFamily?
    let frequencyRank: Int?
    let difficultyLevel: Int
    let tags: [String]?

    var id: String { wordId }

    /// 获取主要释义
    var primaryMeaning: String {
        meanings.first?.definitionZh ?? ""
    }

    /// 获取所有释义的拼接
    var allMeanings: String {
        meanings.map { "\($0.pos) \($0.definitionZh)" }.joined(separator: "; ")
    }

    enum CodingKeys: String, CodingKey {
        case wordId = "word_id"
        case languageCode = "language_code"
        case word
        case phoneticIpa = "phonetic_ipa"
        case meanings
        case wordFamily = "word_family"
        case frequencyRank = "frequency_rank"
        case difficultyLevel = "difficulty_level"
        case tags
    }
}

/// 词库分类
struct WordbookCategory: Codable, Identifiable {
    let categoryId: Int
    let languageCode: String
    let categoryType: String
    let categoryName: String
    let parentId: Int?
    let sortOrder: Int
    let children: [WordbookCategory]

    var id: Int { categoryId }

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case languageCode = "language_code"
        case categoryType = "category_type"
        case categoryName = "category_name"
        case parentId = "parent_id"
        case sortOrder = "sort_order"
        case children
    }
}

/// 词库
struct Wordbook: Codable, Identifiable {
    let bookId: String
    let languageCode: String
    let name: String
    let description: String?
    let wordCount: Int
    let difficulty: Int
    let isFree: Bool
    let coverColor: String?
    let sortOrder: Int

    var id: String { bookId }

    enum CodingKeys: String, CodingKey {
        case bookId = "book_id"
        case languageCode = "language_code"
        case name, description
        case wordCount = "word_count"
        case difficulty
        case isFree = "is_free"
        case coverColor = "cover_color"
        case sortOrder = "sort_order"
    }
}

/// 支持的语言
struct SupportedLanguage: Codable, Identifiable {
    let code: String
    let name: String
    let flag: String?
    let isActive: Bool

    var id: String { code }

    enum CodingKeys: String, CodingKey {
        case code, name, flag
        case isActive = "is_active"
    }
}
