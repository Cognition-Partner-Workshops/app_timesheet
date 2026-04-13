import Foundation
import AVFoundation

/// TTS管理器 - 双层语音合成架构
/// 优先级: 缓存 → 远程TTS(MeloTTS) → 本地TTS(Apple)
class TTSManager: NSObject {

    static let shared = TTSManager()

    /// TTS来源
    enum TTSSource {
        case cached
        case remote
        case local
    }

    /// TTS播放状态
    enum PlaybackState {
        case idle
        case loading
        case playing
        case error(String)
    }

    private let localTTS = LocalTTSProvider()
    private let remoteTTS = RemoteTTSProvider()
    private let cacheManager = AudioCacheManager()

    private(set) var playbackState: PlaybackState = .idle
    private var audioPlayer: AVAudioPlayer?

    /// 合成并播放语音
    /// - Parameters:
    ///   - text: 要合成的文本
    ///   - language: 语言代码
    ///   - speed: 语速 (0.5-2.0)
    ///   - preferRemote: 是否优先使用远程TTS
    func speak(
        text: String,
        language: String,
        speed: Float = 1.0,
        preferRemote: Bool = true
    ) async {
        playbackState = .loading

        // 1. 检查缓存
        if let cachedData = cacheManager.getCachedAudio(text: text, language: language) {
            await playAudioData(cachedData, source: .cached)
            return
        }

        // 2. 尝试远程TTS
        if preferRemote {
            do {
                let audioData = try await remoteTTS.synthesize(text: text, language: language, speed: speed)
                // 缓存结果
                cacheManager.cacheAudio(data: audioData, text: text, language: language)
                await playAudioData(audioData, source: .remote)
                return
            } catch {
                // 远程不可用，降级到本地
            }
        }

        // 3. 本地TTS降级
        localTTS.speak(text: text, language: language, speed: speed)
        playbackState = .playing
    }

    /// 停止播放
    func stop() {
        audioPlayer?.stop()
        localTTS.stop()
        playbackState = .idle
    }

    /// 播放音频数据
    private func playAudioData(_ data: Data, source: TTSSource) async {
        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.play()
            playbackState = .playing
        } catch {
            playbackState = .error("播放失败: \(error.localizedDescription)")
        }
    }
}

extension TTSManager: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        playbackState = .idle
    }
}

/// 本地TTS提供者 - 使用Apple AVSpeechSynthesizer
class LocalTTSProvider: NSObject {
    private let synthesizer = AVSpeechSynthesizer()

    /// 语言代码映射到BCP-47
    private let languageMap: [String: String] = [
        "en": "en-US",
        "fr": "fr-FR",
        "ja": "ja-JP",
        "de": "de-DE",
        "es": "es-ES",
    ]

    func speak(text: String, language: String, speed: Float = 1.0) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: languageMap[language] ?? "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * speed
        utterance.pitchMultiplier = 1.0
        synthesizer.speak(utterance)
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
    }
}

/// 远程TTS提供者 - 调用自建MeloTTS服务
class RemoteTTSProvider {
    private let baseURL: String

    init(baseURL: String = "") {
        // 从配置读取TTS服务地址
        self.baseURL = baseURL.isEmpty ? "http://localhost:5000" : baseURL
    }

    func synthesize(text: String, language: String, speed: Float = 1.0) async throws -> Data {
        let url = URL(string: "\(baseURL)/api/v1/tts/synthesize")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "text": text,
            "language": language,
            "speed": speed,
            "format": "mp3",
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NSError(domain: "TTSError", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "TTS服务暂不可用"
            ])
        }

        return data
    }
}

/// 音频缓存管理器
class AudioCacheManager {
    private let cacheDirectory: URL

    init() {
        let paths = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("tts_cache")
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// 获取缓存的音频
    func getCachedAudio(text: String, language: String) -> Data? {
        let key = cacheKey(text: text, language: language)
        let filePath = cacheDirectory.appendingPathComponent(key)
        return try? Data(contentsOf: filePath)
    }

    /// 缓存音频数据
    func cacheAudio(data: Data, text: String, language: String) {
        let key = cacheKey(text: text, language: language)
        let filePath = cacheDirectory.appendingPathComponent(key)
        try? data.write(to: filePath)
    }

    /// 清除缓存
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }

    /// 获取缓存大小（MB）
    func cacheSize() -> Double {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]
        ) else { return 0 }

        let totalBytes = files.compactMap { url -> Int? in
            let values = try? url.resourceValues(forKeys: [.fileSizeKey])
            return values?.fileSize
        }.reduce(0, +)

        return Double(totalBytes) / 1_048_576.0
    }

    private func cacheKey(text: String, language: String) -> String {
        let combined = "\(language)_\(text)"
        // Simple hash
        let hash = combined.utf8.reduce(0) { ($0 &* 31) &+ Int($1) }
        return "\(abs(hash)).mp3"
    }
}
