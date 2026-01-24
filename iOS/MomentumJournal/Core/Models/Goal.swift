//
//  Goal.swift
//  MomentumJournal
//

import Foundation

enum GoalType: String, Codable, CaseIterable {
    case longTerm = "long-term"
    case shortTerm = "short-term"

    var displayName: String {
        switch self {
        case .longTerm: return "Long-term"
        case .shortTerm: return "Short-term"
        }
    }
}

enum GoalStatus: String, Codable, CaseIterable {
    case active
    case completed
    case paused
    case abandoned

    var displayName: String {
        rawValue.capitalized
    }
}

struct Goal: Codable, Identifiable, Equatable {
    let id: UUID
    let userId: UUID
    var title: String
    var description: String?
    var type: GoalType
    var category: String?
    var targetDate: Date?
    var status: GoalStatus
    var progressPercentage: Int
    let createdAt: Date
    var updatedAt: Date
    var lastSyncedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case description
        case type
        case category
        case targetDate = "target_date"
        case status
        case progressPercentage = "progress_percentage"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case lastSyncedAt = "last_synced_at"
    }

    // Convenience init for creating new goals
    init(
        id: UUID = UUID(),
        userId: UUID,
        title: String,
        description: String? = nil,
        type: GoalType = .shortTerm,
        category: String? = nil,
        targetDate: Date? = nil,
        status: GoalStatus = .active,
        progressPercentage: Int = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        lastSyncedAt: Date? = nil
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.description = description
        self.type = type
        self.category = category
        self.targetDate = targetDate
        self.status = status
        self.progressPercentage = min(100, max(0, progressPercentage))
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.lastSyncedAt = lastSyncedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        userId = try container.decode(UUID.self, forKey: .userId)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        type = try container.decode(GoalType.self, forKey: .type)
        category = try container.decodeIfPresent(String.self, forKey: .category)
        status = try container.decode(GoalStatus.self, forKey: .status)
        progressPercentage = try container.decode(Int.self, forKey: .progressPercentage)
        lastSyncedAt = try container.decodeIfPresent(Date.self, forKey: .lastSyncedAt)

        // Handle date decoding (ISO8601 string or Date)
        if let dateString = try? container.decode(String.self, forKey: .targetDate) {
            targetDate = ISO8601DateFormatter().date(from: dateString)
        } else {
            targetDate = try container.decodeIfPresent(Date.self, forKey: .targetDate)
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
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(type, forKey: .type)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encode(status, forKey: .status)
        try container.encode(progressPercentage, forKey: .progressPercentage)

        let formatter = ISO8601DateFormatter()
        if let targetDate = targetDate {
            try container.encode(formatter.string(from: targetDate), forKey: .targetDate)
        }
        try container.encode(formatter.string(from: createdAt), forKey: .createdAt)
        try container.encode(formatter.string(from: updatedAt), forKey: .updatedAt)
    }
}
