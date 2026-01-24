//
//  JournalsRepository.swift
//  MomentumJournal
//

import Foundation

final class JournalsRepository {
    private let localDataSource: JournalsLocalDataSource
    private let networkDataSource: JournalsNetworkDataSource

    init(
        localDataSource: JournalsLocalDataSource = JournalsLocalDataSource(),
        networkDataSource: JournalsNetworkDataSource = JournalsNetworkDataSource()
    ) {
        self.localDataSource = localDataSource
        self.networkDataSource = networkDataSource
    }

    // MARK: - Get Journals (Offline-First)

    func getJournals(userId: UUID) async throws -> [JournalEntry] {
        // 1. Return cached data immediately
        let cachedEntries = try localDataSource.fetchAll(userId: userId)

        // 2. Fetch from network in background
        do {
            let networkEntries = try await networkDataSource.fetchJournals(userId: userId)

            // 3. Update cache with network data
            for var entry in networkEntries {
                entry.lastSyncedAt = Date()
                try localDataSource.save(entry)
            }

            // Return fresh network data
            return try localDataSource.fetchAll(userId: userId)
        } catch {
            // Network failed, return cached data if available
            if !cachedEntries.isEmpty {
                return cachedEntries
            }
            throw error
        }
    }

    // MARK: - Create Journal

    func createJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        // 1. Save locally first
        try localDataSource.save(entry)

        // 2. Try to sync to network
        do {
            var syncedEntry = try await networkDataSource.createJournal(entry, goalIds: goalIds)
            syncedEntry.lastSyncedAt = Date()
            try localDataSource.save(syncedEntry)
            return syncedEntry
        } catch {
            // Network failed, keep local copy (will sync later)
            return entry
        }
    }

    // MARK: - Update Journal

    func updateJournal(_ entry: JournalEntry, goalIds: [UUID] = []) async throws -> JournalEntry {
        var updatedEntry = entry
        updatedEntry.updatedAt = Date()

        // 1. Save locally first
        try localDataSource.save(updatedEntry)

        // 2. Try to sync to network
        do {
            var syncedEntry = try await networkDataSource.updateJournal(updatedEntry, goalIds: goalIds)
            syncedEntry.lastSyncedAt = Date()
            try localDataSource.save(syncedEntry)
            return syncedEntry
        } catch {
            // Network failed, keep local copy
            return updatedEntry
        }
    }

    // MARK: - Delete Journal

    func deleteJournal(_ id: UUID) async throws {
        // 1. Delete from network first (if possible)
        do {
            try await networkDataSource.deleteJournal(id)
        } catch {
            // Log but continue with local delete
            print("Network delete failed: \(error)")
        }

        // 2. Delete locally
        try localDataSource.delete(id)
    }

    // MARK: - Sync Unsynced Journals

    func syncUnsyncedJournals() async throws {
        let unsyncedEntries = try localDataSource.fetchUnsynced()

        for entry in unsyncedEntries {
            do {
                // Check if entry exists on server
                let serverEntries = try await networkDataSource.fetchJournals(userId: entry.userId)
                let existsOnServer = serverEntries.contains { $0.id == entry.id }

                if existsOnServer {
                    // Update existing
                    var synced = try await networkDataSource.updateJournal(entry, goalIds: entry.linkedGoalIds)
                    synced.lastSyncedAt = Date()
                    try localDataSource.save(synced)
                } else {
                    // Create new
                    var synced = try await networkDataSource.createJournal(entry, goalIds: entry.linkedGoalIds)
                    synced.lastSyncedAt = Date()
                    try localDataSource.save(synced)
                }
            } catch {
                // Skip this entry, try next
                print("Failed to sync journal \(entry.id): \(error)")
            }
        }
    }

    // MARK: - Get Single Journal

    func getJournal(_ id: UUID) async throws -> JournalEntry? {
        if let localEntry = try localDataSource.fetch(id) {
            return localEntry
        }
        return nil
    }
}
