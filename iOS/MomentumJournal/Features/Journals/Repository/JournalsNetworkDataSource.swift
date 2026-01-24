//
//  JournalsNetworkDataSource.swift
//  MomentumJournal
//

import Foundation
import Supabase

final class JournalsNetworkDataSource {
    private var supabase: SupabaseClient {
        SupabaseClientManager.shared.client
    }

    // MARK: - Fetch Journals

    func fetchJournals() async throws -> [JournalEntry] {
        do {
            let journals: [JournalEntry] = try await supabase
                .from("journal_entries")
                .select()
                .execute()
                .value
            return journals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    func fetchJournals(userId: UUID) async throws -> [JournalEntry] {
        do {
            let journals: [JournalEntry] = try await supabase
                .from("journal_entries")
                .select()
                .eq("user_id", value: userId.uuidString)
                .order("entry_date", ascending: false)
                .execute()
                .value
            return journals
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Create Journal

    func createJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        do {
            var entryToCreate = entry
            entryToCreate.linkedGoalIds = goalIds

            let created: JournalEntry = try await supabase
                .from("journal_entries")
                .insert(entryToCreate)
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

    // MARK: - Update Journal

    func updateJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        do {
            var entryToUpdate = entry
            entryToUpdate.linkedGoalIds = goalIds

            let updated: JournalEntry = try await supabase
                .from("journal_entries")
                .update(entryToUpdate)
                .eq("id", value: entry.id.uuidString)
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

    // MARK: - Delete Journal

    func deleteJournal(_ id: UUID) async throws {
        do {
            try await supabase
                .from("journal_entries")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
        } catch let error as PostgrestError {
            throw mapError(error)
        } catch {
            throw APIError.networkError
        }
    }

    // MARK: - Fetch Goal Mentions

    func fetchGoalMentions(journalId: UUID) async throws -> [UUID] {
        do {
            struct GoalMention: Codable {
                let goalId: UUID
                enum CodingKeys: String, CodingKey {
                    case goalId = "goal_id"
                }
            }

            let mentions: [GoalMention] = try await supabase
                .from("journal_goal_mentions")
                .select("goal_id")
                .eq("journal_id", value: journalId.uuidString)
                .execute()
                .value

            return mentions.map { $0.goalId }
        } catch {
            return []
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
