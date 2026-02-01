//
//  APIError.swift
//  MomentumJournal
//

import Foundation

enum APIError: Error, LocalizedError {
    case unauthorized
    case networkError
    case decodingError
    case serverError(String)
    case notFound
    case unknown
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case goalLinkingError(GoalLinkingErrorCode)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "You are not authorized. Please sign in again."
        case .networkError:
            return "Network error. Please check your connection."
        case .decodingError:
            return "Failed to process server response."
        case .serverError(let message):
            return "Server error: \(message)"
        case .notFound:
            return "Resource not found."
        case .unknown:
            return "An unexpected error occurred."
        case .invalidURL:
            return "Invalid URL."
        case .invalidResponse:
            return "Invalid server response."
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .goalLinkingError(let code):
            return code.localizedMessage
        }
    }
}
