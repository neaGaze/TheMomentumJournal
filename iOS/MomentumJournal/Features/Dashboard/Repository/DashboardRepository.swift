//
//  DashboardRepository.swift
//  MomentumJournal
//

import Foundation
import Supabase

final class DashboardRepository {
    private let client: SupabaseClient

    init(client: SupabaseClient = SupabaseClientManager.shared.client) {
        self.client = client
    }

    // MARK: - Fetch Dashboard Stats

    func fetchStats(timeline: Timeline) async throws -> DashboardStats {
        let session = try await client.auth.session
        let accessToken = session.accessToken

        guard let url = URL(string: "\(Config.apiURL)/api/dashboard/stats?timeline=\(timeline.rawValue)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

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

        let apiResponse = try decoder.decode(DashboardStatsResponse.self, from: data)

        guard apiResponse.success, let stats = apiResponse.data else {
            throw APIError.serverError(apiResponse.error?.message ?? "Unknown error")
        }

        return stats
    }
}
