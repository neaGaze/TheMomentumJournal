//
//  LinkGoalSheet.swift
//  MomentumJournal
//

import SwiftUI

struct LinkGoalSheet: View {
    let goal: Goal
    let onLink: (UUID) async throws -> Void
    let onDismiss: () -> Void

    @State private var longTermGoals: [Goal] = []
    @State private var selectedParentId: UUID?
    @State private var isLoading = true
    @State private var isLinking = false
    @State private var errorMessage: String?

    private let repository = GoalsRepository()

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Goal info header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Link to Long-Term Goal")
                        .font(.headline)
                    Text(goal.title)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(.systemGray6))

                // Content
                if isLoading {
                    Spacer()
                    ProgressView("Loading goals...")
                    Spacer()
                } else if longTermGoals.isEmpty {
                    emptyState
                } else {
                    goalsList
                }

                // Error message
                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                }
            }
            .navigationTitle("Link Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onDismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Link") {
                        linkGoal()
                    }
                    .disabled(selectedParentId == nil || isLinking)
                }
            }
            .task {
                await loadLongTermGoals()
            }
        }
    }

    // MARK: - Goals List

    private var goalsList: some View {
        List(longTermGoals, selection: $selectedParentId) { ltGoal in
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(ltGoal.title)
                        .font(.body)
                    if let category = ltGoal.category {
                        Text(category)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                if selectedParentId == ltGoal.id {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                selectedParentId = ltGoal.id
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "target")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("No Long-Term Goals")
                .font(.headline)

            Text("Create a long-term goal first to link short-term goals to it.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Actions

    private func loadLongTermGoals() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let userId = goal.userId
            longTermGoals = try await repository.getLongTermGoals(userId: userId)
                .filter { $0.id != goal.id } // Exclude self
        } catch {
            errorMessage = "Failed to load goals"
        }
    }

    private func linkGoal() {
        guard let parentId = selectedParentId else { return }

        isLinking = true
        errorMessage = nil

        Task {
            do {
                try await onLink(parentId)
                onDismiss()
            } catch let error as APIError {
                errorMessage = error.localizedDescription
            } catch {
                errorMessage = "Failed to link goal"
            }
            isLinking = false
        }
    }
}

#Preview {
    LinkGoalSheet(
        goal: Goal(
            userId: UUID(),
            title: "Learn SwiftUI basics",
            type: .shortTerm
        ),
        onLink: { _ in },
        onDismiss: { }
    )
}
