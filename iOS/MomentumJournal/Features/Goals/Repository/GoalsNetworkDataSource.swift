//
//  GoalsNetworkDataSource.swift
//  MomentumJournal
//

import Foundation

/// Request body for POST /api/goals and PATCH /api/goals/{id}
private struct GoalRequestBody: Encodable {
    let goal: Goal

    enum CodingKeys: String, CodingKey {
        case title, description, type, category, targetDate, status, progressPercentage, parentGoalId
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        // Explicit nulls so PATCH can clear optional fields
        try container.encode(goal.title, forKey: .title)
        try container.encode(goal.description, forKey: .description)
        try container.encode(goal.type, forKey: .type)
        try container.encode(goal.category, forKey: .category)
        try container.encode(goal.targetDate.map(APIDate.dateOnlyString), forKey: .targetDate)
        try container.encode(goal.status, forKey: .status)
        try container.encode(goal.progressPercentage, forKey: .progressPercentage)
        // Long-term goals cannot have a parent
        if goal.type == .shortTerm {
            try container.encode(goal.parentGoalId?.uuidString.lowercased(), forKey: .parentGoalId)
        }
    }
}

final class GoalsNetworkDataSource {
    private let api = APIClient.shared

    // MARK: - Fetch Goals

    func fetchGoals() async throws -> [Goal] {
        try await api.requestAllPages("api/goals")
    }

    /// Server scopes results to the signed-in user; userId kept for call-site compatibility
    func fetchGoals(userId: UUID) async throws -> [Goal] {
        try await fetchGoals()
    }

    // MARK: - Create Goal

    func createGoal(_ goal: Goal) async throws -> Goal {
        try await api.request("POST", "api/goals", body: GoalRequestBody(goal: goal))
    }

    // MARK: - Update Goal

    func updateGoal(_ goal: Goal) async throws -> Goal {
        try await api.request(
            "PATCH", "api/goals/\(goal.id.uuidString.lowercased())",
            body: GoalRequestBody(goal: goal)
        )
    }

    // MARK: - Delete Goal

    func deleteGoal(_ id: UUID) async throws {
        _ = try await api.sendRaw("DELETE", "api/goals/\(id.uuidString.lowercased())")
    }

    // MARK: - Fetch Long-Term Goals (for linking picker)

    func fetchLongTermGoals(userId: UUID) async throws -> [Goal] {
        let goals: [Goal] = try await api.request("GET", "api/goals/long-term")
        return goals.filter { $0.status == .active }
    }

    // MARK: - Link Goal

    func linkGoal(_ goalId: UUID, toParent parentGoalId: UUID) async throws -> Goal {
        struct LinkBody: Encodable {
            let parentGoalId: String
        }
        return try await api.request(
            "POST", "api/goals/\(goalId.uuidString.lowercased())/link",
            body: LinkBody(parentGoalId: parentGoalId.uuidString.lowercased())
        )
    }

    // MARK: - Unlink Goal

    func unlinkGoal(_ goalId: UUID) async throws -> Goal {
        try await api.request("DELETE", "api/goals/\(goalId.uuidString.lowercased())/link")
    }

    // MARK: - Fetch Child Goals

    func fetchChildGoals(parentId: UUID) async throws -> [Goal] {
        try await api.requestAllPages("api/goals", query: ["parentGoalId": parentId.uuidString.lowercased()])
    }

    // MARK: - Fetch Parent Goal

    func fetchParentGoal(childId: UUID) async throws -> Goal? {
        let links: GoalLinksResponse = try await api.request("GET", "api/goals/\(childId.uuidString.lowercased())/link")
        return links.parentGoal
    }
}
