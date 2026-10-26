//
//  JournalsNetworkDataSource.swift
//  MomentumJournal
//

import Foundation

/// Request body for POST /api/journals and PATCH /api/journals/{id}
private struct JournalRequestBody: Encodable {
    let title: String?
    let content: String
    let entryDate: String
    let mood: Mood?
    let tags: [String]
    let goalIds: [String]

    init(_ entry: JournalEntry, goalIds: [UUID]) {
        title = entry.title
        content = entry.content
        entryDate = APIDate.dateOnlyString(entry.entryDate)
        mood = entry.mood
        tags = entry.tags
        self.goalIds = goalIds.map(\.uuidString)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        // Explicit nulls so PATCH can clear title/mood
        try container.encode(title, forKey: .title)
        try container.encode(content, forKey: .content)
        try container.encode(entryDate, forKey: .entryDate)
        try container.encode(mood, forKey: .mood)
        try container.encode(tags, forKey: .tags)
        try container.encode(goalIds, forKey: .goalIds)
    }

    enum CodingKeys: String, CodingKey {
        case title, content, entryDate, mood, tags, goalIds
    }
}

final class JournalsNetworkDataSource {
    private let api = APIClient.shared

    // MARK: - Fetch Journals

    func fetchJournals() async throws -> [JournalEntry] {
        try await api.requestAllPages("api/journals", query: ["sortField": "entry_date", "sortDir": "desc"])
    }

    /// Server scopes results to the signed-in user; userId kept for call-site compatibility
    func fetchJournals(userId: UUID) async throws -> [JournalEntry] {
        try await fetchJournals()
    }

    // MARK: - Create Journal

    func createJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        try await api.request("POST", "api/journals", body: JournalRequestBody(entry, goalIds: goalIds))
    }

    // MARK: - Update Journal

    func updateJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        try await api.request(
            "PATCH", "api/journals/\(entry.id.uuidString.lowercased())",
            body: JournalRequestBody(entry, goalIds: goalIds)
        )
    }

    // MARK: - Delete Journal

    func deleteJournal(_ id: UUID) async throws {
        _ = try await api.sendRaw("DELETE", "api/journals/\(id.uuidString.lowercased())")
    }

    // MARK: - Fetch Goal Mentions

    func fetchGoalMentions(journalId: UUID) async throws -> [UUID] {
        do {
            let goals: [Goal] = try await api.request("GET", "api/journals/\(journalId.uuidString.lowercased())/goals")
            return goals.map(\.id)
        } catch {
            return []
        }
    }
}
