//
//  DashboardViewModel.swift
//  MomentumJournal
//

import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedTimeline: Timeline = .week

    private let repository: DashboardRepository

    init(repository: DashboardRepository = DashboardRepository()) {
        self.repository = repository
    }

    // MARK: - Load Stats

    func loadStats() async {
        isLoading = true
        errorMessage = nil

        do {
            stats = try await repository.fetchStats(timeline: selectedTimeline)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Refresh

    func refresh() async {
        await loadStats()
    }

    // MARK: - Timeline Changed

    func timelineChanged() async {
        await loadStats()
    }
}
