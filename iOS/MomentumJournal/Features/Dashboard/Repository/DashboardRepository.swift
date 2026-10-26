//
//  DashboardRepository.swift
//  MomentumJournal
//

import Foundation

final class DashboardRepository {
    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    // MARK: - Fetch Dashboard Stats

    func fetchStats(timeline: Timeline) async throws -> DashboardStats {
        try await api.request("GET", "api/dashboard/stats", query: ["timeline": timeline.rawValue])
    }
}
