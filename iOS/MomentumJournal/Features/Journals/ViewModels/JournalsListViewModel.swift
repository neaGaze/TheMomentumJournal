//
//  JournalsListViewModel.swift
//  MomentumJournal
//

import Foundation
import Supabase

enum DateSection: String, CaseIterable {
    case today = "Today"
    case yesterday = "Yesterday"
    case thisWeek = "This Week"
    case older = "Older"
}

enum DateRange: String, CaseIterable {
    case today
    case week
    case month
    case all

    var displayName: String {
        switch self {
        case .today: return "Today"
        case .week: return "This Week"
        case .month: return "This Month"
        case .all: return "All Time"
        }
    }
}

@MainActor
final class JournalsListViewModel: ObservableObject {
    @Published var journals: [JournalEntry] = []
    @Published var filteredJournals: [JournalEntry] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var filterMood: Mood?
    @Published var filterDateRange: DateRange?
    @Published var filterGoalId: UUID?
    @Published var searchText = ""

    private let repository: JournalsRepository

    init(repository: JournalsRepository = JournalsRepository()) {
        self.repository = repository
    }

    // MARK: - Load Journals

    func loadJournals() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Please sign in to view journals"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            journals = try await repository.getJournals(userId: userId)
            applyFilters()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Delete Journal

    func deleteJournal(_ id: UUID) async {
        do {
            try await repository.deleteJournal(id)
            journals.removeAll { $0.id == id }
            applyFilters()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Filtering

    func applyFilters() {
        var result = journals

        // Filter by mood
        if let filterMood = filterMood {
            result = result.filter { $0.mood == filterMood }
        }

        // Filter by date range
        if let filterDateRange = filterDateRange {
            let calendar = Calendar.current
            let now = Date()

            switch filterDateRange {
            case .today:
                result = result.filter { calendar.isDateInToday($0.entryDate) }
            case .week:
                let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) ?? now
                result = result.filter { $0.entryDate >= weekAgo }
            case .month:
                let monthAgo = calendar.date(byAdding: .month, value: -1, to: now) ?? now
                result = result.filter { $0.entryDate >= monthAgo }
            case .all:
                break
            }
        }

        // Filter by linked goal
        if let filterGoalId = filterGoalId {
            result = result.filter { $0.linkedGoalIds.contains(filterGoalId) }
        }

        // Filter by search text
        if !searchText.isEmpty {
            result = result.filter {
                $0.content.localizedCaseInsensitiveContains(searchText) ||
                ($0.title?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                $0.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }

        filteredJournals = result
    }

    func clearFilters() {
        filterMood = nil
        filterDateRange = nil
        filterGoalId = nil
        searchText = ""
        applyFilters()
    }

    // MARK: - Grouped Journals by Date Section

    var journalsBySection: [DateSection: [JournalEntry]] {
        let calendar = Calendar.current
        let now = Date()

        var grouped: [DateSection: [JournalEntry]] = [:]

        for entry in filteredJournals {
            let section: DateSection

            if calendar.isDateInToday(entry.entryDate) {
                section = .today
            } else if calendar.isDateInYesterday(entry.entryDate) {
                section = .yesterday
            } else if let weekAgo = calendar.date(byAdding: .day, value: -7, to: now),
                      entry.entryDate >= weekAgo {
                section = .thisWeek
            } else {
                section = .older
            }

            if grouped[section] == nil {
                grouped[section] = []
            }
            grouped[section]?.append(entry)
        }

        return grouped
    }

    var orderedSections: [DateSection] {
        DateSection.allCases.filter { journalsBySection[$0] != nil }
    }

    // MARK: - Sync

    func syncJournals() async {
        do {
            try await repository.syncUnsyncedJournals()
            await loadJournals()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Private

    private func getCurrentUserId() async -> UUID? {
        do {
            let session = try await SupabaseClientManager.shared.client.auth.session
            return UUID(uuidString: session.user.id.uuidString)
        } catch {
            return nil
        }
    }
}
