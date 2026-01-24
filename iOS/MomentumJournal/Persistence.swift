//
//  Persistence.swift
//  MomentumJournal
//
//  Created for The Momentum Journal iOS App
//

import CoreData

struct PersistenceController {
    static let shared = PersistenceController()

    static var preview: PersistenceController = {
        let result = PersistenceController(inMemory: true)
        let viewContext = result.container.viewContext

        // Create sample data for previews
        let sampleGoal = GoalEntity(context: viewContext)
        sampleGoal.id = UUID()
        sampleGoal.userId = UUID()
        sampleGoal.title = "Sample Goal"
        sampleGoal.goalDescription = "This is a sample goal for preview"
        sampleGoal.type = "personal"
        sampleGoal.status = "active"
        sampleGoal.progressPercentage = 50
        sampleGoal.createdAt = Date()
        sampleGoal.updatedAt = Date()

        let sampleEntry = JournalEntryEntity(context: viewContext)
        sampleEntry.id = UUID()
        sampleEntry.userId = UUID()
        sampleEntry.title = "Sample Entry"
        sampleEntry.content = "This is a sample journal entry for preview"
        sampleEntry.entryDate = Date()
        sampleEntry.createdAt = Date()
        sampleEntry.updatedAt = Date()

        do {
            try viewContext.save()
        } catch {
            let nsError = error as NSError
            fatalError("Unresolved error \(nsError), \(nsError.userInfo)")
        }
        return result
    }()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "MomentumJournal")
        if inMemory {
            container.persistentStoreDescriptions.first!.url = URL(fileURLWithPath: "/dev/null")
        }
        container.loadPersistentStores { storeDescription, error in
            if let error = error as NSError? {
                // Replace this with proper error handling in production
                fatalError("Unresolved error \(error), \(error.userInfo)")
            }
        }
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
}
