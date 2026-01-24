//
//  DashboardStats.swift
//  MomentumJournal
//

import Foundation

// MARK: - Timeline

enum Timeline: String, CaseIterable {
    case week
    case month
    case year

    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - API Response Wrapper

struct DashboardStatsResponse: Codable {
    let success: Bool
    let data: DashboardStats?
    let error: APIErrorResponse?
}

struct APIErrorResponse: Codable {
    let message: String
    let status: Int?
}

// MARK: - Dashboard Stats

struct DashboardStats: Codable {
    let goals: GoalsStats
    let journals: JournalStats
    let recentActivity: [RecentActivityItem]
}

// MARK: - Goals Stats

struct GoalsStats: Codable {
    let total: Int
    let byStatus: GoalsByStatus
    let byType: GoalsByType
    let completionRate: Int
    let averageProgress: Int

    // Computed properties for backward compatibility
    var totalGoals: Int { total }
    var activeGoals: Int { byStatus.active }
    var completedGoals: Int { byStatus.completed }
}

struct GoalsByStatus: Codable {
    let active: Int
    let completed: Int
    let paused: Int
    let abandoned: Int
}

struct GoalsByType: Codable {
    let longTerm: Int
    let shortTerm: Int

    enum CodingKeys: String, CodingKey {
        case longTerm = "long-term"
        case shortTerm = "short-term"
    }
}

// MARK: - Journal Stats

struct JournalStats: Codable {
    let total: Int
    let byMood: JournalsByMood
    let currentStreak: Int
    let longestStreak: Int
    let avgEntriesPerWeek: Double

    // Computed properties for backward compatibility
    var totalJournals: Int { total }
    var entriesThisWeek: Int { Int(avgEntriesPerWeek.rounded()) }
}

struct JournalsByMood: Codable {
    let great: Int
    let good: Int
    let neutral: Int
    let bad: Int
    let terrible: Int
}

// MARK: - Recent Activity Item

struct RecentActivityItem: Codable, Identifiable {
    let id: UUID
    let type: ActivityType
    let title: String
    let createdAt: Date
    let updatedAt: Date
    // Goal-specific
    let status: String?
    let progressPercentage: Int?
    // Journal-specific
    let mood: String?
    let entryDate: Date?

    // Computed properties for convenience
    var timestamp: Date { updatedAt }
    var entityId: UUID { id }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        // Parse id as string then convert to UUID
        let idString = try container.decode(String.self, forKey: .id)
        id = UUID(uuidString: idString) ?? UUID()

        type = try container.decode(ActivityType.self, forKey: .type)
        title = try container.decode(String.self, forKey: .title)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        progressPercentage = try container.decodeIfPresent(Int.self, forKey: .progressPercentage)
        mood = try container.decodeIfPresent(String.self, forKey: .mood)

        // Handle date decoding with ISO8601
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let createdAtString = try? container.decode(String.self, forKey: .createdAt) {
            createdAt = dateFormatter.date(from: createdAtString) ?? Date()
        } else {
            createdAt = Date()
        }

        if let updatedAtString = try? container.decode(String.self, forKey: .updatedAt) {
            updatedAt = dateFormatter.date(from: updatedAtString) ?? Date()
        } else {
            updatedAt = Date()
        }

        if let entryDateString = try? container.decode(String.self, forKey: .entryDate) {
            entryDate = dateFormatter.date(from: entryDateString)
        } else {
            entryDate = nil
        }
    }

    private enum CodingKeys: String, CodingKey {
        case id, type, title, createdAt, updatedAt, status, progressPercentage, mood, entryDate
    }
}

// MARK: - Activity Type

enum ActivityType: String, Codable {
    case goal
    case journal

    var icon: String {
        switch self {
        case .goal: return "target"
        case .journal: return "book.fill"
        }
    }

    var color: String {
        switch self {
        case .goal: return "green"
        case .journal: return "purple"
        }
    }

    var isGoal: Bool {
        self == .goal
    }
}
