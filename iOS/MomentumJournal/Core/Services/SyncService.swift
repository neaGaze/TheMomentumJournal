//
//  SyncService.swift
//  MomentumJournal
//

import Foundation

@MainActor
final class SyncService: ObservableObject {
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?

    private let goalsRepository: GoalsRepository
    private let journalsRepository: JournalsRepository

    private let lastSyncKey = "lastSyncDate"

    init(
        goalsRepository: GoalsRepository = GoalsRepository(),
        journalsRepository: JournalsRepository = JournalsRepository()
    ) {
        self.goalsRepository = goalsRepository
        self.journalsRepository = journalsRepository
        loadLastSyncDate()
    }

    // MARK: - Full Sync

    func sync() async {
        guard !isSyncing else { return }
        isSyncing = true

        await syncGoals()
        await syncJournals()

        lastSyncDate = Date()
        saveLastSyncDate()
        isSyncing = false
    }

    // MARK: - Sync Goals

    func syncGoals() async {
        do {
            try await goalsRepository.syncUnsyncedGoals()
        } catch {
            print("Goals sync failed: \(error)")
        }
    }

    // MARK: - Sync Journals

    func syncJournals() async {
        do {
            try await journalsRepository.syncUnsyncedJournals()
        } catch {
            print("Journals sync failed: \(error)")
        }
    }

    // MARK: - Retry Failed Operations

    func retryFailedOperations() async {
        await sync()
    }

    // MARK: - Persistence

    private func loadLastSyncDate() {
        if let timestamp = UserDefaults.standard.object(forKey: lastSyncKey) as? TimeInterval {
            lastSyncDate = Date(timeIntervalSince1970: timestamp)
        }
    }

    private func saveLastSyncDate() {
        if let date = lastSyncDate {
            UserDefaults.standard.set(date.timeIntervalSince1970, forKey: lastSyncKey)
        }
    }
}
