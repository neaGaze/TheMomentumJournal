//
//  JournalsLocalDataSource.swift
//  MomentumJournal
//

import Foundation
import CoreData

final class JournalsLocalDataSource {
    private let persistence: PersistenceController

    init(persistence: PersistenceController = .shared) {
        self.persistence = persistence
    }

    private var context: NSManagedObjectContext {
        persistence.container.viewContext
    }

    // MARK: - Fetch All

    func fetchAll() throws -> [JournalEntry] {
        let request = JournalEntryEntity.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \JournalEntryEntity.entryDate, ascending: false)]

        let entities = try context.fetch(request)
        return entities.compactMap { toJournalEntry($0) }
    }

    func fetchAll(userId: UUID) throws -> [JournalEntry] {
        let request = JournalEntryEntity.fetchRequest()
        request.predicate = NSPredicate(format: "userId == %@", userId as CVarArg)
        request.sortDescriptors = [NSSortDescriptor(keyPath: \JournalEntryEntity.entryDate, ascending: false)]

        let entities = try context.fetch(request)
        return entities.compactMap { toJournalEntry($0) }
    }

    // MARK: - Save

    func save(_ entry: JournalEntry) throws {
        let request = JournalEntryEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", entry.id as CVarArg)

        let entity: JournalEntryEntity
        if let existing = try context.fetch(request).first {
            entity = existing
        } else {
            entity = JournalEntryEntity(context: context)
            entity.id = entry.id
            entity.createdAt = entry.createdAt
        }

        entity.userId = entry.userId
        entity.title = entry.title
        entity.content = entry.content
        entity.entryDate = entry.entryDate
        entity.mood = entry.mood?.rawValue
        entity.tags = entry.tags as NSArray
        entity.updatedAt = entry.updatedAt
        entity.lastSyncedAt = entry.lastSyncedAt

        try context.save()
    }

    func saveAll(_ entries: [JournalEntry]) throws {
        for entry in entries {
            try save(entry)
        }
    }

    // MARK: - Delete

    func delete(_ id: UUID) throws {
        let request = JournalEntryEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)

        if let entity = try context.fetch(request).first {
            context.delete(entity)
            try context.save()
        }
    }

    // MARK: - Fetch Single

    func fetch(_ id: UUID) throws -> JournalEntry? {
        let request = JournalEntryEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)

        guard let entity = try context.fetch(request).first else {
            return nil
        }
        return toJournalEntry(entity)
    }

    // MARK: - Unsynced Entries

    func fetchUnsynced() throws -> [JournalEntry] {
        let request = JournalEntryEntity.fetchRequest()
        request.predicate = NSPredicate(format: "lastSyncedAt == nil OR lastSyncedAt < updatedAt")

        let entities = try context.fetch(request)
        return entities.compactMap { toJournalEntry($0) }
    }

    // MARK: - Conversion

    private func toJournalEntry(_ entity: JournalEntryEntity) -> JournalEntry? {
        guard let id = entity.id,
              let userId = entity.userId,
              let content = entity.content,
              let entryDate = entity.entryDate,
              let createdAt = entity.createdAt,
              let updatedAt = entity.updatedAt else {
            return nil
        }

        let mood: Mood? = entity.mood.flatMap { Mood(rawValue: $0) }
        let tags: [String] = (entity.tags as? [String]) ?? []

        return JournalEntry(
            id: id,
            userId: userId,
            title: entity.title,
            content: content,
            entryDate: entryDate,
            mood: mood,
            tags: tags,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: entity.lastSyncedAt,
            linkedGoalIds: [] // Populated separately from network
        )
    }
}
