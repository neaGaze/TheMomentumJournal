//
//  APIClient.swift
//  MomentumJournal
//

import Foundation

/// Standard `{ success, data, error }` envelope returned by the Next.js API
struct APIEnvelope<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorBody?
    let pagination: Pagination?
}

struct APIErrorBody: Decodable {
    let message: String?
    let code: String?
}

struct Pagination: Decodable {
    let page: Int
    let totalPages: Int
    let hasNext: Bool
}

/// Body-less type for requests whose response data is ignored
struct EmptyBody: Codable {}

/// HTTP client for the Next.js API. Sends the session token as `Authorization: Bearer`.
final class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let baseURL: URL

    private init(session: URLSession = .shared) {
        guard let url = URL(string: Config.apiURL) else {
            fatalError("Invalid API URL")
        }
        self.session = session
        self.baseURL = url
    }

    // MARK: - Requests

    /// Sends a request and unwraps the `data` field of the API envelope
    func request<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String] = [:],
        body: (any Encodable)? = nil,
        timeout: TimeInterval = 30
    ) async throws -> T {
        let envelope: APIEnvelope<T> = try await send(method, path, query: query, body: body, timeout: timeout)
        guard let data = envelope.data else {
            throw APIError.invalidResponse
        }
        return data
    }

    /// Fetches every page of a paginated list endpoint
    func requestAllPages<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> [T] {
        var results: [T] = []
        var page = 1
        while true {
            var pageQuery = query
            pageQuery["page"] = String(page)
            pageQuery["pageSize"] = "100"
            let envelope: APIEnvelope<[T]> = try await send("GET", path, query: pageQuery, body: nil, timeout: 30)
            results.append(contentsOf: envelope.data ?? [])
            guard let pagination = envelope.pagination, pagination.hasNext else { break }
            page += 1
        }
        return results
    }

    /// Sends a request and decodes the raw (non-envelope) JSON response
    func send<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String] = [:],
        body: (any Encodable)? = nil,
        timeout: TimeInterval = 30,
        authorized: Bool = true
    ) async throws -> T {
        let data = try await sendRaw(method, path, query: query, body: body, timeout: timeout, authorized: authorized)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }

    /// Sends a request and returns the raw response body after status checks
    func sendRaw(
        _ method: String,
        _ path: String,
        query: [String: String] = [:],
        body: (any Encodable)? = nil,
        timeout: TimeInterval = 30,
        authorized: Bool = true
    ) async throws -> Data {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        if !query.isEmpty {
            components?.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components?.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = timeout
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authorized, let token = KeychainService.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw mapError(status: httpResponse.statusCode, data: data)
        }

        return data
    }

    // MARK: - Error Mapping

    private func mapError(status: Int, data: Data) -> APIError {
        struct ErrorResponse: Decodable {
            let error: ErrorField?
        }
        // Routes return either `{ error: { message, code } }` or `{ error: "message" }`
        enum ErrorField: Decodable {
            case body(APIErrorBody)
            case message(String)

            init(from decoder: Decoder) throws {
                let container = try decoder.singleValueContainer()
                if let message = try? container.decode(String.self) {
                    self = .message(message)
                } else {
                    self = .body(try container.decode(APIErrorBody.self))
                }
            }
        }

        let field = (try? JSONDecoder().decode(ErrorResponse.self, from: data))?.error
        var message: String?
        var code: String?
        switch field {
        case .body(let body):
            message = body.message
            code = body.code
        case .message(let text):
            message = text
        case .none:
            break
        }

        if let code, let linkingCode = GoalLinkingErrorCode(rawValue: code) {
            return .goalLinkingError(linkingCode)
        }

        switch status {
        case 401:
            return .unauthorized
        case 404:
            return .notFound
        default:
            if let message {
                return .serverError(message)
            }
            return .httpError(status)
        }
    }
}

// MARK: - Date Helpers

enum APIDate {
    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let internet: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let dateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }()

    /// Parses ISO8601 timestamps (with or without fractional seconds) and YYYY-MM-DD dates
    static func parse(_ string: String) -> Date? {
        fractional.date(from: string) ?? internet.date(from: string) ?? dateOnly.date(from: string)
    }

    /// Formats a date as YYYY-MM-DD (UTC) for DATE columns
    static func dateOnlyString(_ date: Date) -> String {
        dateOnly.string(from: date)
    }
}
