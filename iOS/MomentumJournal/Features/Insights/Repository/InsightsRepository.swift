//
//  InsightsRepository.swift
//  MomentumJournal
//

import Foundation

final class InsightsRepository {
    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    // MARK: - Fetch Cached Insights

    /// GET returns cached insights, generating them if none exist for the period
    func fetchInsights(timeline: InsightsTimeline) async throws -> AIInsights? {
        do {
            let data = try await api.sendRaw("GET", "api/ai/insights", query: ["timeline": timeline.rawValue], timeout: 60)
            return try Self.parse(data, timeline: timeline)
        } catch APIError.notFound {
            return nil
        }
    }

    // MARK: - Generate New Insights

    func generateNewInsights(timeline: InsightsTimeline) async throws -> AIInsights {
        struct GenerateBody: Encodable {
            let timeline: String
            let refresh: Bool
        }
        let data = try await api.sendRaw(
            "POST", "api/ai/insights",
            body: GenerateBody(timeline: timeline.rawValue, refresh: true),
            timeout: 60 // 60s timeout for AI generation
        )
        return try Self.parse(data, timeline: timeline)
    }

    // MARK: - Response Mapping

    /// Maps `{ data: { analysis: AIAnalysis, summary?, ... } }` into AIInsights.
    /// The analysis `insights`/`recommendations` columns are loosely typed JSONB, so parse leniently.
    private static func parse(_ data: Data, timeline: InsightsTimeline) throws -> AIInsights {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let payload = root["data"] as? [String: Any],
              let analysis = payload["analysis"] as? [String: Any] else {
            throw APIError.decodingError
        }

        let insights = analysis["insights"] as? [String: Any] ?? [:]
        let recs = analysis["recommendations"] as? [String: Any] ?? [:]
        let createdAt = (analysis["createdAt"] as? String).flatMap(APIDate.parse) ?? Date()

        let summary = payload["summary"] as? String ?? insights["summary"] as? String ?? ""

        let patterns = (insights["patterns"] as? [String] ?? []).map {
            Pattern(description: $0, frequency: "", impact: .medium)
        }

        let suggestions = (recs["suggestions"] as? [String] ?? []) + (recs["action_items"] as? [String] ?? [])
        let improvements = insights["areas_for_improvement"] as? [[String: Any]] ?? []
        let recommendations = improvements.compactMap { item -> Recommendation? in
            guard let area = item["area"] as? String else { return nil }
            return Recommendation(title: area, description: item["suggestion"] as? String ?? "")
        } + suggestions.map { Recommendation(title: $0, description: "") }

        let updates = (insights["goal_progress_updates"] as? [[String: Any]] ?? []).compactMap { item -> GoalProgressUpdate? in
            guard let goalId = (item["goal_id"] as? String).flatMap(UUID.init(uuidString:)),
                  let title = item["goal_title"] as? String else { return nil }
            let observation = item["notes"] as? String
                ?? "Progress \(item["previous_progress"] as? Int ?? 0)% → \(item["current_progress"] as? Int ?? 0)%"
            return GoalProgressUpdate(goalId: goalId, goalTitle: title, observation: observation)
        }

        return AIInsights(
            id: (analysis["id"] as? String).flatMap(UUID.init(uuidString:)) ?? UUID(),
            userId: (analysis["userId"] as? String).flatMap(UUID.init(uuidString:)) ?? UUID(),
            timeline: timeline,
            summary: summary,
            patterns: patterns,
            sentiment: insights["sentiment"] as? String ?? "neutral",
            themes: insights["key_themes"] as? [String] ?? [],
            recommendations: recommendations,
            goalProgressUpdates: updates,
            generatedAt: createdAt,
            createdAt: createdAt
        )
    }
}
