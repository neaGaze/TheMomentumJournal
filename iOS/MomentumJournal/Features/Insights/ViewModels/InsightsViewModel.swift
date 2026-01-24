//
//  InsightsViewModel.swift
//  MomentumJournal
//

import Foundation
import Supabase

@MainActor
final class InsightsViewModel: ObservableObject {
    @Published var insights: AIInsights?
    @Published var isLoading = false
    @Published var isGenerating = false
    @Published var errorMessage: String?
    @Published var selectedTimeline: InsightsTimeline = .week

    private let repository: InsightsRepository

    init(repository: InsightsRepository = InsightsRepository()) {
        self.repository = repository
    }

    // MARK: - Load Insights

    func loadInsights() async {
        guard !isGenerating else { return }

        isLoading = true
        errorMessage = nil

        do {
            insights = try await repository.fetchInsights(timeline: selectedTimeline)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Generate New Insights

    func generateNewInsights() async {
        isGenerating = true
        errorMessage = nil

        do {
            insights = try await repository.generateNewInsights(timeline: selectedTimeline)
        } catch {
            errorMessage = error.localizedDescription
        }

        isGenerating = false
    }

    // MARK: - Timeline Changed

    func timelineChanged() async {
        await loadInsights()
    }

    // MARK: - Time Ago String

    var generatedTimeAgo: String? {
        guard let generatedAt = insights?.generatedAt else { return nil }

        let now = Date()
        let interval = now.timeIntervalSince(generatedAt)

        if interval < 60 {
            return "Generated just now"
        } else if interval < 3600 {
            let minutes = Int(interval / 60)
            return "Generated \(minutes) minute\(minutes == 1 ? "" : "s") ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "Generated \(hours) hour\(hours == 1 ? "" : "s") ago"
        } else {
            let days = Int(interval / 86400)
            return "Generated \(days) day\(days == 1 ? "" : "s") ago"
        }
    }

    // MARK: - Sentiment Emoji

    var sentimentEmoji: String {
        guard let sentiment = insights?.sentiment.lowercased() else { return "neutral" }

        switch sentiment {
        case let s where s.contains("positive") || s.contains("happy") || s.contains("great"):
            return "face.smiling"
        case let s where s.contains("negative") || s.contains("sad") || s.contains("stressed"):
            return "cloud.rain"
        case let s where s.contains("mixed"):
            return "face.dashed"
        case let s where s.contains("neutral"):
            return "minus.circle"
        case let s where s.contains("motivated") || s.contains("excited"):
            return "star.fill"
        case let s where s.contains("anxious") || s.contains("worried"):
            return "exclamationmark.triangle"
        default:
            return "brain.head.profile"
        }
    }
}
