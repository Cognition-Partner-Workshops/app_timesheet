import Foundation

/// API客户端 - 处理所有与后端的HTTP通信
class APIClient {

    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private var accessToken: String?
    private var refreshToken: String?

    init(baseURL: String = "http://localhost:8080/api/v1") {
        self.baseURL = baseURL
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    /// 设置认证Token
    func setTokens(access: String, refresh: String) {
        self.accessToken = access
        self.refreshToken = refresh
    }

    /// 清除Token
    func clearTokens() {
        self.accessToken = nil
        self.refreshToken = nil
    }

    // MARK: - Generic Request Methods

    func get<T: Decodable>(_ path: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        let request = try buildRequest(method: "GET", path: path, queryItems: queryItems)
        return try await execute(request)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(method: "POST", path: path)
        request.httpBody = try JSONEncoder.api.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await execute(request)
    }

    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(method: "PUT", path: path)
        request.httpBody = try JSONEncoder.api.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await execute(request)
    }

    func delete(_ path: String) async throws {
        let request = try buildRequest(method: "DELETE", path: path)
        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed
        }
    }

    // MARK: - Private Methods

    private func buildRequest(
        method: String,
        path: String,
        queryItems: [URLQueryItem]? = nil
    ) throws -> URLRequest {
        var components = URLComponents(string: "\(baseURL)\(path)")!
        components.queryItems = queryItems

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.requestFailed
        }

        switch httpResponse.statusCode {
        case 200...299:
            let decoder = JSONDecoder.api
            return try decoder.decode(T.self, from: data)
        case 401:
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 400...499:
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorResponse.detail)
            }
            throw APIError.requestFailed
        default:
            throw APIError.serverError("服务器错误 (\(httpResponse.statusCode))")
        }
    }
}

/// API错误类型
enum APIError: Error, LocalizedError {
    case invalidURL
    case requestFailed
    case unauthorized
    case notFound
    case serverError(String)
    case decodingError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "无效的请求地址"
        case .requestFailed: return "请求失败"
        case .unauthorized: return "认证失败，请重新登录"
        case .notFound: return "请求的资源不存在"
        case .serverError(let msg): return msg
        case .decodingError(let msg): return "数据解析失败: \(msg)"
        }
    }
}

/// 服务器错误响应
struct ErrorResponse: Decodable {
    let detail: String
}

// MARK: - JSON Encoder/Decoder Extensions

extension JSONEncoder {
    static let api: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()
}
