//
//  GoalFormViewModel.swift
//  MomentumJournal
//

import Foundation
import Supabase

@MainActor
final class GoalFormViewModel: ObservableObject {
    @Published var title = ""
    @Published var description = ""
    @Published var type: GoalType = .shortTerm {
        didSet {
            // Clear parent when changing to long-term
            if type == .longTerm {
                selectedParentGoalId = nil
            }
        }
    }
    @Published var category = ""
    @Published var targetDate: Date?
    @Published var hasTargetDate = false
    @Published var status: GoalStatus = .active
    @Published var progressPercentage: Double = 0

    // Parent goal linking
    @Published var selectedParentGoalId: UUID?
    @Published var longTermGoals: [Goal] = []
    @Published var isLoadingLongTermGoals = false

    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var validationError: String?

    private let repository: GoalsRepository
    private var existingGoal: Goal?

    var isEditing: Bool { existingGoal != nil }

    /// Long-term goals excluding current goal (prevent self-linking)
    var availableParentGoals: [Goal] {
        longTermGoals.filter { $0.id != existingGoal?.id }
    }

    /// Currently selected parent goal
    var selectedParentGoal: Goal? {
        guard let parentId = selectedParentGoalId else { return nil }
        return longTermGoals.first { $0.id == parentId }
    }

    /// Whether editing a goal that has a parent (type change blocked)
    var hasParent: Bool {
        existingGoal?.parentGoalId != nil
    }

    init(repository: GoalsRepository = GoalsRepository(), goal: Goal? = nil) {
        self.repository = repository
        self.existingGoal = goal

        if let goal = goal {
            title = goal.title
            description = goal.description ?? ""
            type = goal.type
            category = goal.category ?? ""
            targetDate = goal.targetDate
            hasTargetDate = goal.targetDate != nil
            status = goal.status
            progressPercentage = Double(goal.progressPercentage)
            selectedParentGoalId = goal.parentGoalId
        }
    }

    // MARK: - Load Long-Term Goals

    func loadLongTermGoals() async {
        guard let userId = await getCurrentUserId() else { return }

        isLoadingLongTermGoals = true
        defer { isLoadingLongTermGoals = false }

        do {
            longTermGoals = try await repository.getLongTermGoals(userId: userId)
        } catch {
            print("Failed to load long-term goals: \(error)")
        }
    }

    // MARK: - Validation

    func validate() -> Bool {
        validationError = nil

        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            validationError = "Title is required"
            return false
        }

        if title.count > 200 {
            validationError = "Title must be less than 200 characters"
            return false
        }

        if progressPercentage < 0 || progressPercentage > 100 {
            validationError = "Progress must be between 0 and 100"
            return false
        }

        return true
    }

    // MARK: - Save

    func save() async throws -> Goal {
        guard validate() else {
            throw GoalFormError.validationFailed(validationError ?? "Invalid input")
        }

        guard let userId = await getCurrentUserId() else {
            throw GoalFormError.notAuthenticated
        }

        isSaving = true
        errorMessage = nil

        defer { isSaving = false }

        let goal = Goal(
            id: existingGoal?.id ?? UUID(),
            userId: userId,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.isEmpty ? nil : description,
            type: type,
            category: category.isEmpty ? nil : category,
            targetDate: hasTargetDate ? targetDate : nil,
            status: status,
            progressPercentage: Int(progressPercentage),
            parentGoalId: type == .shortTerm ? selectedParentGoalId : nil,
            createdAt: existingGoal?.createdAt ?? Date(),
            updatedAt: Date(),
            lastSyncedAt: nil
        )

        do {
            if isEditing {
                return try await repository.updateGoal(goal)
            } else {
                return try await repository.createGoal(goal)
            }
        } catch {
            errorMessage = error.localizedDescription
            throw error
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

// MARK: - Errors

enum GoalFormError: LocalizedError {
    case validationFailed(String)
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .validationFailed(let message):
            return message
        case .notAuthenticated:
            return "Please sign in to save goals"
        }
    }
}
