//
//  InsightsRepository.swift
//  MomentumJournal
//

import Foundation
import Supabase

final class InsightsRepository {
    private let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClientManager.shared.client) {
        self.client = client
    }

    // MARK: - Fetch Cached Insights

    func fetchInsights(timeline: InsightsTimeline) async throws -> AIInsights? {
        let session = try await client.auth.session
        let accessToken = session.accessToken

        guard let url = URL(string: "\(Config.supabaseURL)/functions/v1/api/ai/insights?timeline=\(timeline.rawValue)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // 404 means no cached insights exist
        if httpResponse.statusCode == 404 {
            return nil
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorMessage = String(data: data, encoding: .utf8) {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(AIInsights.self, from: data)
    }

    // MARK: - Generate New Insights

    func generateNewInsights(timeline: InsightsTimeline) async throws -> AIInsights {
        let session = try await client.auth.session
        let accessToken = session.accessToken

        guard let url = URL(string: "\(Config.supabaseURL)/functions/v1/api/ai/insights") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.timeoutInterval = 60 // 60s timeout for AI generation

        let body = ["timeline": timeline.rawValue]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorMessage = String(data: data, encoding: .utf8) {
                throw APIError.serverError(errorMessage)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(AIInsights.self, from: data)
    }
}
