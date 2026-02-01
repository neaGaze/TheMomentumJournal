//
//  JournalEntry.swift
//  MomentumJournal
//

import Foundation

enum Mood: String, Codable, CaseIterable {
    case great
    case good
    case neutral
    case bad
    case terrible

    var emoji: String {
        switch self {
        case .great: return "😊"
        case .good: return "🙂"
        case .neutral: return "😐"
        case .bad: return "😞"
        case .terrible: return "😢"
        }
    }

    var displayName: String {
        rawValue.capitalized
    }
}

struct JournalEntry: Codable, Identifiable, Equatable {
    let id: UUID
    let userId: UUID
    var title: String?
    var content: String
    var entryDate: Date
    var mood: Mood?
    var tags: [String]
    let createdAt: Date
    var updatedAt: Date
    var lastSyncedAt: Date?

    // Not in DB, populated from journal_goal_mentions
    var linkedGoalIds: [UUID]

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case content
        case entryDate = "entry_date"
        case mood
        case tags
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case lastSyncedAt = "last_synced_at"
        case linkedGoalIds = "goal_ids"
    }

    init(
        id: UUID = UUID(),
        userId: UUID,
        title: String? = nil,
        content: String = "",
        entryDate: Date = Date(),
        mood: Mood? = nil,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        lastSyncedAt: Date? = nil,
        linkedGoalIds: [UUID] = []
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.content = content
        self.entryDate = entryDate
        self.mood = mood
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.lastSyncedAt = lastSyncedAt
        self.linkedGoalIds = linkedGoalIds
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        userId = try container.decode(UUID.self, forKey: .userId)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        content = try container.decode(String.self, forKey: .content)
        mood = try container.decodeIfPresent(Mood.self, forKey: .mood)
        tags = try container.decodeIfPresent([String].self, forKey: .tags) ?? []
        lastSyncedAt = try container.decodeIfPresent(Date.self, forKey: .lastSyncedAt)
        linkedGoalIds = try container.decodeIfPresent([UUID].self, forKey: .linkedGoalIds) ?? []

        // Handle date decoding (ISO8601 string or Date)
        entryDate = Self.decodeDate(from: container, forKey: .entryDate) ?? Date()
        createdAt = Self.decodeDate(from: container, forKey: .createdAt) ?? Date()
        updatedAt = Self.decodeDate(from: container, forKey: .updatedAt) ?? Date()
    }

    private static func decodeDate(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) -> Date? {
        // Try decoding as Date first
        if let date = try? container.decode(Date.self, forKey: key) {
            return date
        }

        // Try decoding as String
        guard let dateString = try? container.decode(String.self, forKey: key) else {
            return nil
        }

        // ISO8601 with fractional seconds (Supabase TIMESTAMPTZ format)
        let formatterWithFractional = ISO8601DateFormatter()
        formatterWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatterWithFractional.date(from: dateString) {
            return date
        }

        // ISO8601 without fractional seconds
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: dateString) {
            return date
        }

        // Date-only format (YYYY-MM-DD) for Supabase DATE fields
        let dateOnlyFormatter = DateFormatter()
        dateOnlyFormatter.dateFormat = "yyyy-MM-dd"
        dateOnlyFormatter.timeZone = TimeZone(identifier: "UTC")
        if let date = dateOnlyFormatter.date(from: dateString) {
            return date
        }

        return nil
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encode(content, forKey: .content)
        try container.encodeIfPresent(mood, forKey: .mood)
        try container.encode(tags, forKey: .tags)

        // entry_date is DATE type in DB - use date-only format
        let dateOnlyFormatter = DateFormatter()
        dateOnlyFormatter.dateFormat = "yyyy-MM-dd"
        dateOnlyFormatter.timeZone = TimeZone(identifier: "UTC")
        try container.encode(dateOnlyFormatter.string(from: entryDate), forKey: .entryDate)

        // created_at and updated_at are TIMESTAMPTZ - use ISO8601
        let formatter = ISO8601DateFormatter()
        try container.encode(formatter.string(from: createdAt), forKey: .createdAt)
        try container.encode(formatter.string(from: updatedAt), forKey: .updatedAt)

        if !linkedGoalIds.isEmpty {
            try container.encode(linkedGoalIds, forKey: .linkedGoalIds)
        }
    }

    static func == (lhs: JournalEntry, rhs: JournalEntry) -> Bool {
        lhs.id == rhs.id
    }
}
