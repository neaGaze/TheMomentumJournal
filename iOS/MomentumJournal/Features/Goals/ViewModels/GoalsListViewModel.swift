//
//  GoalsListViewModel.swift
//  MomentumJournal
//

import Foundation
import Supabase

@MainActor
final class GoalsListViewModel: ObservableObject {
    @Published var goals: [Goal] = []
    @Published var filteredGoals: [Goal] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var filterType: GoalType?
    @Published var filterStatus: GoalStatus?
    @Published var searchText = ""

    private let repository: GoalsRepository

    init(repository: GoalsRepository = GoalsRepository()) {
        self.repository = repository
    }

    // MARK: - Load Goals

    func loadGoals() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Please sign in to view goals"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            goals = try await repository.getGoals(userId: userId)
            applyFilters()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Delete Goal

    func deleteGoal(_ id: UUID) async {
        do {
            try await repository.deleteGoal(id)
            goals.removeAll { $0.id == id }
            applyFilters()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Filtering

    func applyFilters() {
        var result = goals

        // Filter by type
        if let filterType = filterType {
            result = result.filter { $0.type == filterType }
        }

        // Filter by status
        if let filterStatus = filterStatus {
            result = result.filter { $0.status == filterStatus }
        }

        // Filter by search text
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                ($0.description?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                ($0.category?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        filteredGoals = result
    }

    func clearFilters() {
        filterType = nil
        filterStatus = nil
        searchText = ""
        applyFilters()
    }

    // MARK: - Sync

    func syncGoals() async {
        do {
            try await repository.syncUnsyncedGoals()
            await loadGoals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Link Goal

    func linkGoal(_ goalId: UUID, toParent parentGoalId: UUID) async throws {
        let updatedGoal = try await repository.linkGoal(goalId, toParent: parentGoalId)

        // Update local array
        if let index = goals.firstIndex(where: { $0.id == goalId }) {
            goals[index] = updatedGoal
            applyFilters()
        }
    }

    // MARK: - Unlink Goal

    func unlinkGoal(_ goalId: UUID) async throws {
        let updatedGoal = try await repository.unlinkGoal(goalId)

        // Update local array
        if let index = goals.firstIndex(where: { $0.id == goalId }) {
            goals[index] = updatedGoal
            applyFilters()
        }
    }

    // MARK: - Grouped Goals

    var goalsByType: [GoalType: [Goal]] {
        Dictionary(grouping: filteredGoals, by: { $0.type })
    }

    var goalsByStatus: [GoalStatus: [Goal]] {
        Dictionary(grouping: filteredGoals, by: { $0.status })
    }

    // MARK: - Private

    private func getCurrentUserId() async -> UUID? {
        do {
            let session = try await SupabaseClientManager.shared.client.auth.session
            return UUID(uuidString: session.user.id.uuidString)
        } catch {
            return nil
        }
    }
}
