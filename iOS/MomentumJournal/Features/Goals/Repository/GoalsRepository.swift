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

    // MARK: - Get Long-Term Goals (for linking)

    func getLongTermGoals(userId: UUID) async throws -> [Goal] {
        // Return cached data immediately
        let cachedGoals = try localDataSource.fetchLongTermGoals(userId: userId)

        // Fetch from network
        do {
            let networkGoals = try await networkDataSource.fetchLongTermGoals(userId: userId)

            // Update cache
            for var goal in networkGoals {
                goal.lastSyncedAt = Date()
                try localDataSource.save(goal)
            }

            return try localDataSource.fetchLongTermGoals(userId: userId)
        } catch {
            if !cachedGoals.isEmpty {
                return cachedGoals
            }
            throw error
        }
    }

    // MARK: - Link Goal

    func linkGoal(_ goalId: UUID, toParent parentGoalId: UUID) async throws -> Goal {
        // Update locally first
        if var localGoal = try localDataSource.fetch(goalId) {
            localGoal.parentGoalId = parentGoalId
            localGoal.updatedAt = Date()
            try localDataSource.save(localGoal)
        }

        // Sync to network
        do {
            var syncedGoal = try await networkDataSource.linkGoal(goalId, toParent: parentGoalId)
            syncedGoal.lastSyncedAt = Date()
            try localDataSource.save(syncedGoal)
            return syncedGoal
        } catch {
            // Revert local change on error
            if var localGoal = try localDataSource.fetch(goalId) {
                localGoal.parentGoalId = nil
                try localDataSource.save(localGoal)
            }
            throw error
        }
    }

    // MARK: - Unlink Goal

    func unlinkGoal(_ goalId: UUID) async throws -> Goal {
        var originalParentId: UUID?

        // Update locally first
        if var localGoal = try localDataSource.fetch(goalId) {
            originalParentId = localGoal.parentGoalId
            localGoal.parentGoalId = nil
            localGoal.updatedAt = Date()
            try localDataSource.save(localGoal)
        }

        // Sync to network
        do {
            var syncedGoal = try await networkDataSource.unlinkGoal(goalId)
            syncedGoal.lastSyncedAt = Date()
            try localDataSource.save(syncedGoal)
            return syncedGoal
        } catch {
            // Revert local change on error - always restore original parent
            if var localGoal = try localDataSource.fetch(goalId) {
                localGoal.parentGoalId = originalParentId
                try localDataSource.save(localGoal)
            }
            throw error
        }
    }

    // MARK: - Get Child Goals

    func getChildGoals(parentId: UUID) async throws -> [Goal] {
        let cachedGoals = try localDataSource.fetchChildGoals(parentId: parentId)

        do {
            let networkGoals = try await networkDataSource.fetchChildGoals(parentId: parentId)
            for var goal in networkGoals {
                goal.lastSyncedAt = Date()
                try localDataSource.save(goal)
            }
            return try localDataSource.fetchChildGoals(parentId: parentId)
        } catch {
            if !cachedGoals.isEmpty {
                return cachedGoals
            }
            throw error
        }
    }

    // MARK: - Get Parent Goal

    func getParentGoal(childId: UUID) async throws -> Goal? {
        // Try local first
        guard let localGoal = try localDataSource.fetch(childId) else {
            return try await networkDataSource.fetchParentGoal(childId: childId)
        }

        // Early return if no parent
        guard let parentId = localGoal.parentGoalId else {
            return nil
        }

        // Try local parent
        if let parentGoal = try localDataSource.fetch(parentId) {
            return parentGoal
        }

        // Fetch from network
        return try await networkDataSource.fetchParentGoal(childId: childId)
    }
}
