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
        if let dateString = try? container.decode(String.self, forKey: .entryDate) {
            entryDate = ISO8601DateFormatter().date(from: dateString) ?? Date()
        } else {
            entryDate = try container.decode(Date.self, forKey: .entryDate)
        }

        if let dateString = try? container.decode(String.self, forKey: .createdAt) {
            createdAt = ISO8601DateFormatter().date(from: dateString) ?? Date()
        } else {
            createdAt = try container.decode(Date.self, forKey: .createdAt)
        }

        if let dateString = try? container.decode(String.self, forKey: .updatedAt) {
            updatedAt = ISO8601DateFormatter().date(from: dateString) ?? Date()
        } else {
            updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encode(content, forKey: .content)
        try container.encodeIfPresent(mood, forKey: .mood)
        try container.encode(tags, forKey: .tags)

        let formatter = ISO8601DateFormatter()
        try container.encode(formatter.string(from: entryDate), forKey: .entryDate)
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
