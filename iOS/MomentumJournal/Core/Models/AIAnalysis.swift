//
//  AIAnalysis.swift
//  MomentumJournal
//

import Foundation

// MARK: - Insights Timeline

enum InsightsTimeline: String, CaseIterable, Codable {
    case week
    case month

    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - AI Insights

struct AIInsights: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let timeline: InsightsTimeline
    let summary: String
    let patterns: [Pattern]
    let sentiment: String
    let themes: [String]
    let recommendations: [Recommendation]
    let goalProgressUpdates: [GoalProgressUpdate]
    let generatedAt: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case timeline
        case summary
        case patterns
        case sentiment
        case themes
        case recommendations
        case goalProgressUpdates = "goal_progress_updates"
        case generatedAt = "generated_at"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        userId = try container.decode(UUID.self, forKey: .userId)
        timeline = try container.decode(InsightsTimeline.self, forKey: .timeline)
        summary = try container.decode(String.self, forKey: .summary)
        patterns = try container.decodeIfPresent([Pattern].self, forKey: .patterns) ?? []
        sentiment = try container.decode(String.self, forKey: .sentiment)
        themes = try container.decodeIfPresent([String].self, forKey: .themes) ?? []
        recommendations = try container.decodeIfPresent([Recommendation].self, forKey: .recommendations) ?? []
        goalProgressUpdates = try container.decodeIfPresent([GoalProgressUpdate].self, forKey: .goalProgressUpdates) ?? []

        // Handle date decoding
        if let dateString = try? container.decode(String.self, forKey: .generatedAt) {
            generatedAt = ISO8601DateFormatter().date(from: dateString) ?? Date()
        } else {
            generatedAt = try container.decode(Date.self, forKey: .generatedAt)
        }

        if let dateString = try? container.decode(String.self, forKey: .createdAt) {
            createdAt = ISO8601DateFormatter().date(from: dateString) ?? Date()
        } else {
            createdAt = try container.decode(Date.self, forKey: .createdAt)
        }
    }

    init(
        id: UUID = UUID(),
        userId: UUID,
        timeline: InsightsTimeline,
        summary: String,
        patterns: [Pattern] = [],
        sentiment: String,
        themes: [String] = [],
        recommendations: [Recommendation] = [],
        goalProgressUpdates: [GoalProgressUpdate] = [],
        generatedAt: Date = Date(),
        createdAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.timeline = timeline
        self.summary = summary
        self.patterns = patterns
        self.sentiment = sentiment
        self.themes = themes
        self.recommendations = recommendations
        self.goalProgressUpdates = goalProgressUpdates
        self.generatedAt = generatedAt
        self.createdAt = createdAt
    }
}

// MARK: - Pattern

struct Pattern: Codable, Identifiable {
    let id: UUID
    let description: String
    let frequency: String
    let impact: PatternImpact

    enum CodingKeys: String, CodingKey {
        case id
        case description
        case frequency
        case impact
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        description = try container.decode(String.self, forKey: .description)
        frequency = try container.decode(String.self, forKey: .frequency)
        impact = try container.decode(PatternImpact.self, forKey: .impact)
    }

    init(id: UUID = UUID(), description: String, frequency: String, impact: PatternImpact) {
        self.id = id
        self.description = description
        self.frequency = frequency
        self.impact = impact
    }
}

enum PatternImpact: String, Codable {
    case high
    case medium
    case low

    var color: String {
        switch self {
        case .high: return "red"
        case .medium: return "yellow"
        case .low: return "green"
        }
    }
}

// MARK: - Recommendation

struct Recommendation: Codable, Identifiable {
    let id: UUID
    let title: String
    let description: String
    let relatedGoalId: UUID?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case relatedGoalId = "related_goal_id"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        title = try container.decode(String.self, forKey: .title)
        description = try container.decode(String.self, forKey: .description)
        relatedGoalId = try container.decodeIfPresent(UUID.self, forKey: .relatedGoalId)
    }

    init(id: UUID = UUID(), title: String, description: String, relatedGoalId: UUID? = nil) {
        self.id = id
        self.title = title
        self.description = description
        self.relatedGoalId = relatedGoalId
    }
}

// MARK: - Goal Progress Update

struct GoalProgressUpdate: Codable, Identifiable {
    let id: UUID
    let goalId: UUID
    let goalTitle: String
    let observation: String
    let suggestedActions: [String]

    enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case goalTitle = "goal_title"
        case observation
        case suggestedActions = "suggested_actions"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        goalId = try container.decode(UUID.self, forKey: .goalId)
        goalTitle = try container.decode(String.self, forKey: .goalTitle)
        observation = try container.decode(String.self, forKey: .observation)
        suggestedActions = try container.decodeIfPresent([String].self, forKey: .suggestedActions) ?? []
    }

    init(id: UUID = UUID(), goalId: UUID, goalTitle: String, observation: String, suggestedActions: [String] = []) {
        self.id = id
        self.goalId = goalId
        self.goalTitle = goalTitle
        self.observation = observation
        self.suggestedActions = suggestedActions
    }
}
