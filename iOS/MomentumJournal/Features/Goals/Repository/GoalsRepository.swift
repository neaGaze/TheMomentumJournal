//
//  GoalsRepository.swift
//  MomentumJournal
//

import Foundation

final class GoalsRepository {
    private let localDataSource: GoalsLocalDataSource
    private let networkDataSource: GoalsNetworkDataSource

    init(
        localDataSource: GoalsLocalDataSource = GoalsLocalDataSource(),
        networkDataSource: GoalsNetworkDataSource = GoalsNetworkDataSource()
    ) {
        self.localDataSource = localDataSource
        self.networkDataSource = networkDataSource
    }

    // MARK: - Get Goals (Offline-First)

    func getGoals(userId: UUID) async throws -> [Goal] {
        // 1. Return cached data immediately
        let cachedGoals = try localDataSource.fetchAll(userId: userId)

        // 2. Fetch from network in background
        do {
            let networkGoals = try await networkDataSource.fetchGoals(userId: userId)

            // 3. Update cache with network data
            for var goal in networkGoals {
                goal.lastSyncedAt = Date()
                try localDataSource.save(goal)
            }

            // Return fresh network data
            return try localDataSource.fetchAll(userId: userId)
        } catch {
            // Network failed, return cached data if available
            if !cachedGoals.isEmpty {
                return cachedGoals
            }
            throw error
        }
    }

    // MARK: - Create Goal

    func createGoal(_ goal: Goal) async throws -> Goal {
        // 1. Save locally first
        try localDataSource.save(goal)

        // 2. Try to sync to network
        do {
            var syncedGoal = try await networkDataSource.createGoal(goal)
            syncedGoal.lastSyncedAt = Date()
            try localDataSource.save(syncedGoal)
            return syncedGoal
        } catch {
            // Network failed, keep local copy (will sync later)
            return goal
        }
    }

    // MARK: - Update Goal

    func updateGoal(_ goal: Goal) async throws -> Goal {
        var updatedGoal = goal
        updatedGoal.updatedAt = Date()

        // 1. Save locally first
        try localDataSource.save(updatedGoal)

        // 2. Try to sync to network
        do {
            var syncedGoal = try await networkDataSource.updateGoal(updatedGoal)
            syncedGoal.lastSyncedAt = Date()
            try localDataSource.save(syncedGoal)
            return syncedGoal
        } catch {
            // Network failed, keep local copy
            return updatedGoal
        }
    }

    // MARK: - Delete Goal

    func deleteGoal(_ id: UUID) async throws {
        // 1. Delete from network first (if possible)
        do {
            try await networkDataSource.deleteGoal(id)
        } catch {
            // Log but continue with local delete
            print("Network delete failed: \(error)")
        }

        // 2. Delete locally
        try localDataSource.delete(id)
    }

    // MARK: - Sync Unsynced Goals

    func syncUnsyncedGoals() async throws {
        let unsyncedGoals = try localDataSource.fetchUnsynced()

        for goal in unsyncedGoals {
            do {
                // Check if goal exists on server
                let serverGoals = try await networkDataSource.fetchGoals(userId: goal.userId)
                let existsOnServer = serverGoals.contains { $0.id == goal.id }

                if existsOnServer {
                    // Update existing
                    var synced = try await networkDataSource.updateGoal(goal)
                    synced.lastSyncedAt = Date()
                    try localDataSource.save(synced)
                } else {
                    // Create new
                    var synced = try await networkDataSource.createGoal(goal)
                    synced.lastSyncedAt = Date()
                    try localDataSource.save(synced)
                }
            } catch {
                // Skip this goal, try next
                print("Failed to sync goal \(goal.id): \(error)")
            }
        }
    }

    // MARK: - Resolve Sync Conflicts

    func resolveConflict(local: Goal, remote: Goal) -> Goal {
        // Simple resolution: most recent update wins
        if local.updatedAt > remote.updatedAt {
            return local
        } else {
            return remote
        }
    }

    // MARK: - Get Single Goal

    func getGoal(_ id: UUID) async throws -> Goal? {
        // Try local first
        if let localGoal = try localDataSource.fetch(id) {
            return localGoal
        }
        return nil
    }
}
