//
//  GoalsNetworkDataSource.swift
//  MomentumJournal
//

import Foundation
import Supabase

final class GoalsNetworkDataSource {
    private var supabase: SupabaseClient {
        SupabaseClientManager.shared.client
    }

    // MARK: - Fetch Goals

    func fetchGoals() async throws -> [Goal] {
        do {
            let goals: [Goal] = try await supabase
                .from("goals")
                .select()
                .execute()
                .value
            return goals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    func fetchGoals(userId: UUID) async throws -> [Goal] {
        do {
            let goals: [Goal] = try await supabase
                .from("goals")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value
            return goals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Create Goal

    func createGoal(_ goal: Goal) async throws -> Goal {
        do {
            let created: Goal = try await supabase
                .from("goals")
                .insert(goal)
                .select()
                .single()
                .execute()
                .value
            return created
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Update Goal

    func updateGoal(_ goal: Goal) async throws -> Goal {
        do {
            let updated: Goal = try await supabase
                .from("goals")
                .update(goal)
                .eq("id", value: goal.id.uuidString)
                .select()
                .single()
                .execute()
                .value
            return updated
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Delete Goal

    func deleteGoal(_ id: UUID) async throws {
        do {
            try await supabase
                .from("goals")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Fetch Long-Term Goals (for linking picker)

    func fetchLongTermGoals(userId: UUID) async throws -> [Goal] {
        do {
            let goals: [Goal] = try await supabase
                .from("goals")
                .select()
                .eq("user_id", value: userId.uuidString)
                .eq("type", value: "long-term")
                .eq("status", value: "active")
                .execute()
                .value
            return goals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Link Goal

    func linkGoal(_ goalId: UUID, toParent parentGoalId: UUID) async throws -> Goal {
        do {
            let updated: Goal = try await supabase
                .from("goals")
                .update(["parent_goal_id": parentGoalId.uuidString])
                .eq("id", value: goalId.uuidString)
                .select()
                .single()
                .execute()
                .value
            return updated
        } catch let error as PostgrestError {
            throw mapGoalLinkingError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Unlink Goal

    func unlinkGoal(_ goalId: UUID) async throws -> Goal {
        do {
            let updated: Goal = try await supabase
                .from("goals")
                .update(["parent_goal_id": NSNull()])
                .eq("id", value: goalId.uuidString)
                .select()
                .single()
                .execute()
                .value
            return updated
        } catch let error as PostgrestError {
            throw mapGoalLinkingError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Fetch Child Goals

    func fetchChildGoals(parentId: UUID) async throws -> [Goal] {
        do {
            let goals: [Goal] = try await supabase
                .from("goals")
                .select()
                .eq("parent_goal_id", value: parentId.uuidString)
                .execute()
                .value
            return goals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Fetch Parent Goal

    func fetchParentGoal(childId: UUID) async throws -> Goal? {
        do {
            let child: Goal = try await supabase
                .from("goals")
                .select()
                .eq("id", value: childId.uuidString)
                .single()
                .execute()
                .value

            guard let parentId = child.parentGoalId else {
                return nil
            }

            let parent: Goal = try await supabase
                .from("goals")
                .select()
                .eq("id", value: parentId.uuidString)
                .single()
                .execute()
                .value
            return parent
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: PostgrestError) -> APIError {
        if error.message.contains("401") || error.message.contains("unauthorized") {
            return .unauthorized
        }
        if error.message.contains("404") || error.message.contains("not found") {
            return .notFound
        }
        return .serverError(error.message)
    }

    private func mapGoalLinkingError(_ error: PostgrestError) -> APIError {
        let message = error.message.lowercased()
        if message.contains("parent goal must be a long-term goal") {
            return .goalLinkingError(.parentNotLongTerm)
        }
        if message.contains("already linked") || message.contains("goal_has_parent") {
            return .goalLinkingError(.goalAlreadyLinked)
        }
        if message.contains("has children") || message.contains("has linked") {
            return .goalLinkingError(.goalHasChildren)
        }
        if message.contains("cannot be its own parent") || message.contains("self") || message.contains("own parent") {
            return .goalLinkingError(.selfLinkNotAllowed)
        }
        if message.contains("goal not found") || message.contains("goal_not_found") {
            return .goalLinkingError(.goalNotFound)
        }
        if message.contains("parent not found") || message.contains("parent_not_found") {
            return .goalLinkingError(.parentNotFound)
        }
        if message.contains("child not short-term") || message.contains("child_not_short_term") {
            return .goalLinkingError(.childNotShortTerm)
        }
        if message.contains("type_change_blocked") {
            return .goalLinkingError(.typeChangeBlocked)
        }
        return mapError(error)
    }
}
