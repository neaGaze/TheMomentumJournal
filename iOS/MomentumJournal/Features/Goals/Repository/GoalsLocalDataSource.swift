//
//  GoalsLocalDataSource.swift
//  MomentumJournal
//

import Foundation
import CoreData

final class GoalsLocalDataSource {
    private let persistence: PersistenceController

    init(persistence: PersistenceController = .shared) {
        self.persistence = persistence
    }

    private var context: NSManagedObjectContext {
        persistence.container.viewContext
    }

    // MARK: - Fetch All

    func fetchAll() throws -> [Goal] {
        let request = GoalEntity.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \GoalEntity.updatedAt, ascending: false)]

        let entities = try context.fetch(request)
        return entities.compactMap { toGoal($0) }
    }

    func fetchAll(userId: UUID) throws -> [Goal] {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "userId == %@", userId as CVarArg)
        request.sortDescriptors = [NSSortDescriptor(keyPath: \GoalEntity.updatedAt, ascending: false)]

        let entities = try context.fetch(request)
        return entities.compactMap { toGoal($0) }
    }

    // MARK: - Save

    func save(_ goal: Goal) throws {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", goal.id as CVarArg)

        let entity: GoalEntity
        if let existing = try context.fetch(request).first {
            entity = existing
        } else {
            entity = GoalEntity(context: context)
            entity.id = goal.id
            entity.createdAt = goal.createdAt
        }

        entity.userId = goal.userId
        entity.title = goal.title
        entity.goalDescription = goal.description
        entity.type = goal.type.rawValue
        entity.category = goal.category
        entity.targetDate = goal.targetDate
        entity.status = goal.status.rawValue
        entity.progressPercentage = Int16(goal.progressPercentage)
        entity.parentGoalId = goal.parentGoalId
        entity.updatedAt = goal.updatedAt
        entity.lastSyncedAt = goal.lastSyncedAt

        try context.save()
    }

    func saveAll(_ goals: [Goal]) throws {
        for goal in goals {
            try save(goal)
        }
    }

    // MARK: - Delete

    func delete(_ id: UUID) throws {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)

        if let entity = try context.fetch(request).first {
            context.delete(entity)
            try context.save()
        }
    }

    // MARK: - Fetch Single

    func fetch(_ id: UUID) throws -> Goal? {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)

        guard let entity = try context.fetch(request).first else {
            return nil
        }
        return toGoal(entity)
    }

    // MARK: - Unsynced Goals

    func fetchUnsynced() throws -> [Goal] {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "lastSyncedAt == nil OR lastSyncedAt < updatedAt")

        let entities = try context.fetch(request)
        return entities.compactMap { toGoal($0) }
    }

    // MARK: - Conversion

    // MARK: - Fetch Long-Term Goals

    func fetchLongTermGoals(userId: UUID) throws -> [Goal] {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            NSPredicate(format: "userId == %@", userId as CVarArg),
            NSPredicate(format: "type == %@", GoalType.longTerm.rawValue),
            NSPredicate(format: "status == %@", GoalStatus.active.rawValue)
        ])
        request.sortDescriptors = [NSSortDescriptor(keyPath: \GoalEntity.title, ascending: true)]

        let entities = try context.fetch(request)
        return entities.compactMap { toGoal($0) }
    }

    // MARK: - Fetch Child Goals

    func fetchChildGoals(parentId: UUID) throws -> [Goal] {
        let request = GoalEntity.fetchRequest()
        request.predicate = NSPredicate(format: "parentGoalId == %@", parentId as CVarArg)
        request.sortDescriptors = [NSSortDescriptor(keyPath: \GoalEntity.updatedAt, ascending: false)]

        let entities = try context.fetch(request)
        return entities.compactMap { toGoal($0) }
    }

    // MARK: - Conversion

    private func toGoal(_ entity: GoalEntity) -> Goal? {
        guard let id = entity.id,
              let userId = entity.userId,
              let title = entity.title,
              let typeString = entity.type,
              let type = GoalType(rawValue: typeString),
              let statusString = entity.status,
              let status = GoalStatus(rawValue: statusString),
              let createdAt = entity.createdAt,
              let updatedAt = entity.updatedAt else {
            return nil
        }

        return Goal(
            id: id,
            userId: userId,
            title: title,
            description: entity.goalDescription,
            type: type,
            category: entity.category,
            targetDate: entity.targetDate,
            status: status,
            progressPercentage: Int(entity.progressPercentage),
            parentGoalId: entity.parentGoalId,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: entity.lastSyncedAt
        )
    }
}
