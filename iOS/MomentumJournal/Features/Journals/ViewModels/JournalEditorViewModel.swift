//
//  JournalEditorViewModel.swift
//  MomentumJournal
//

import Foundation
import Combine
import Supabase

@MainActor
final class JournalEditorViewModel: ObservableObject {
    @Published var title: String = ""
    @Published var content: String = ""
    @Published var entryDate: Date = Date()
    @Published var mood: Mood?
    @Published var tags: [String] = []
    @Published var linkedGoalIds: [UUID] = []

    @Published var availableGoals: [Goal] = []
    @Published var isSaving = false
    @Published var isAutoSaving = false
    @Published var errorMessage: String?
    @Published var validationError: String?

    private let repository: JournalsRepository
    private let goalsRepository: GoalsRepository
    private var existingEntry: JournalEntry?
    private var autoSaveTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    static let maxContentLength = 50 * 1024 // 50KB

    private let draftKey = "journal_draft"

    var isEditing: Bool { existingEntry != nil }

    var contentLength: Int { content.utf8.count }

    var contentLengthDisplay: String {
        let kb = Double(contentLength) / 1024.0
        return String(format: "%.1f KB / 50 KB", kb)
    }

    var isNearLimit: Bool {
        contentLength > Int(Double(Self.maxContentLength) * 0.9)
    }

    var isOverLimit: Bool {
        contentLength > Self.maxContentLength
    }

    init(
        entry: JournalEntry? = nil,
        repository: JournalsRepository = JournalsRepository(),
        goalsRepository: GoalsRepository = GoalsRepository()
    ) {
        self.existingEntry = entry
        self.repository = repository
        self.goalsRepository = goalsRepository

        if let entry = entry {
            self.title = entry.title ?? ""
            self.content = entry.content
            self.entryDate = entry.entryDate
            self.mood = entry.mood
            self.tags = entry.tags
            self.linkedGoalIds = entry.linkedGoalIds
        } else {
            loadDraft()
        }

        setupAutoSave()
    }

    deinit {
        autoSaveTimer?.invalidate()
    }

    // MARK: - Load Available Goals

    func loadGoals() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            availableGoals = try await goalsRepository.getGoals(userId: userId)
        } catch {
            print("Failed to load goals: \(error)")
        }
    }

    // MARK: - Save

    func save() async throws -> JournalEntry {
        guard validate() else {
            throw NSError(domain: "JournalEditor", code: 1, userInfo: [NSLocalizedDescriptionKey: validationError ?? "Validation failed"])
        }

        guard let userId = await getCurrentUserId() else {
            throw NSError(domain: "JournalEditor", code: 2, userInfo: [NSLocalizedDescriptionKey: "Not signed in"])
        }

        isSaving = true
        errorMessage = nil

        defer { isSaving = false }

        if let existing = existingEntry {
            // Update existing
            var updated = existing
            updated.title = title.isEmpty ? nil : title
            updated.content = content
            updated.entryDate = entryDate
            updated.mood = mood
            updated.tags = tags
            updated.linkedGoalIds = linkedGoalIds
            updated.updatedAt = Date()

            let saved = try await repository.updateJournal(updated, goalIds: linkedGoalIds)
            clearDraft()
            return saved
        } else {
            // Create new
            let entry = JournalEntry(
                userId: userId,
                title: title.isEmpty ? nil : title,
                content: content,
                entryDate: entryDate,
                mood: mood,
                tags: tags,
                linkedGoalIds: linkedGoalIds
            )

            let saved = try await repository.createJournal(entry, goalIds: linkedGoalIds)
            clearDraft()
            return saved
        }
    }

    // MARK: - Validation

    private func validate() -> Bool {
        validationError = nil

        if content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            validationError = "Content is required"
            return false
        }

        if isOverLimit {
            validationError = "Content exceeds 50KB limit"
            return false
        }

        return true
    }

    // MARK: - Auto-Save Draft

    private func setupAutoSave() {
        // Only auto-save for new entries
        guard existingEntry == nil else { return }

        autoSaveTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.saveDraft()
            }
        }
    }

    func saveDraft() {
        guard existingEntry == nil else { return }
        guard !content.isEmpty || !title.isEmpty else { return }

        isAutoSaving = true

        let draft = JournalDraft(
            title: title,
            content: content,
            entryDate: entryDate,
            mood: mood?.rawValue,
            tags: tags,
            linkedGoalIds: linkedGoalIds.map { $0.uuidString }
        )

        if let data = try? JSONEncoder().encode(draft) {
            UserDefaults.standard.set(data, forKey: draftKey)
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.isAutoSaving = false
        }
    }

    func loadDraft() {
        guard let data = UserDefaults.standard.data(forKey: draftKey),
              let draft = try? JSONDecoder().decode(JournalDraft.self, from: data) else {
            return
        }

        title = draft.title
        content = draft.content
        entryDate = draft.entryDate
        mood = draft.mood.flatMap { Mood(rawValue: $0) }
        tags = draft.tags
        linkedGoalIds = draft.linkedGoalIds.compactMap { UUID(uuidString: $0) }
    }

    func clearDraft() {
        UserDefaults.standard.removeObject(forKey: draftKey)
    }

    var hasDraft: Bool {
        UserDefaults.standard.data(forKey: draftKey) != nil
    }

    // MARK: - Tags

    func addTag(_ tag: String) {
        let trimmed = tag.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !tags.contains(trimmed) else { return }
        tags.append(trimmed)
    }

    func removeTag(_ tag: String) {
        tags.removeAll { $0 == tag }
    }

    // MARK: - Goal Linking

    func toggleGoalLink(_ goalId: UUID) {
        if linkedGoalIds.contains(goalId) {
            linkedGoalIds.removeAll { $0 == goalId }
        } else {
            linkedGoalIds.append(goalId)
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

// MARK: - Draft Model

private struct JournalDraft: Codable {
    let title: String
    let content: String
    let entryDate: Date
    let mood: String?
    let tags: [String]
    let linkedGoalIds: [String]
}
