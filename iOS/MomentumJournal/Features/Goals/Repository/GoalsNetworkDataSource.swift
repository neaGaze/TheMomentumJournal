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
}
