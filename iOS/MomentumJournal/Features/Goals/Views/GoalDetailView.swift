//
//  GoalDetailView.swift
//  MomentumJournal
//

import SwiftUI

struct GoalDetailView: View {
    let goal: Goal
    let onEdit: () -> Void
    let onDelete: () -> Void
    var onLink: ((UUID) async throws -> Void)?
    var onUnlink: (() async throws -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var showingDeleteConfirmation = false
    @State private var showingLinkSheet = false
    @State private var parentGoal: Goal?
    @State private var childGoals: [Goal] = []
    @State private var isLoadingLinks = false
    @State private var isUnlinking = false
    @State private var linkError: String?

    private let repository = GoalsRepository()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                headerSection

                // Parent Goal Section (for short-term goals)
                if goal.type == .shortTerm {
                    parentGoalSection
                }

                // Child Goals Section (for long-term goals)
                if goal.type == .longTerm {
                    childGoalsSection
                }

                // Progress Section
                progressSection

                // Details Section
                detailsSection

                // Linked Journals Placeholder
                linkedJournalsSection

                Spacer()
            }
            .padding()
        }
        .navigationTitle("Goal Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        onEdit()
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }

                    // Link/Unlink action for short-term goals
                    if goal.type == .shortTerm {
                        if goal.parentGoalId != nil {
                            Button {
                                unlinkGoal()
                            } label: {
                                Label("Unlink from Parent", systemImage: "link.badge.minus")
                            }
                        } else if onLink != nil {
                            Button {
                                showingLinkSheet = true
                            } label: {
                                Label("Link to Goal", systemImage: "link.badge.plus")
                            }
                        }
                    }

                    Button(role: .destructive) {
                        showingDeleteConfirmation = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .confirmationDialog("Delete Goal?", isPresented: $showingDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                onDelete()
                dismiss()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("This action cannot be undone.")
        }
        .sheet(isPresented: $showingLinkSheet) {
            if let linkAction = onLink {
                LinkGoalSheet(
                    goal: goal,
                    onLink: linkAction,
                    onDismiss: { showingLinkSheet = false }
                )
            }
        }
        .alert("Error", isPresented: .constant(linkError != nil)) {
            Button("OK") { linkError = nil }
        } message: {
            Text(linkError ?? "")
        }
        .task {
            await loadLinkedGoals()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                typeTag
                statusTag
                Spacer()
            }

            Text(goal.title)
                .font(.title)
                .fontWeight(.bold)

            if let description = goal.description, !description.isEmpty {
                Text(description)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var typeTag: some View {
        Text(goal.type.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(goal.type == .longTerm ? Color.purple.opacity(0.2) : Color.green.opacity(0.2))
            .foregroundColor(goal.type == .longTerm ? .purple : .green)
            .cornerRadius(8)
    }

    private var statusTag: some View {
        Text(goal.status.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(8)
    }

    private var statusColor: Color {
        switch goal.status {
        case .active: return .blue
        case .completed: return .green
        case .paused: return .orange
        case .abandoned: return .gray
        }
    }

    // MARK: - Progress Section

    private var progressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Progress")
                .font(.headline)

            VStack(spacing: 8) {
                HStack {
                    Text("\(goal.progressPercentage)%")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(progressColor)

                    Spacer()

                    if goal.progressPercentage == 100 {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.title2)
                    }
                }

                ProgressView(value: Double(goal.progressPercentage), total: 100)
                    .tint(progressColor)
                    .scaleEffect(y: 2)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private var progressColor: Color {
        switch goal.progressPercentage {
        case 0..<25: return .red
        case 25..<50: return .orange
        case 50..<75: return .yellow
        case 75..<100: return .green
        default: return .blue
        }
    }

    // MARK: - Details Section

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Details")
                .font(.headline)

            VStack(spacing: 0) {
                if let category = goal.category {
                    detailRow(icon: "tag", title: "Category", value: category)
                    Divider()
                }

                if let targetDate = goal.targetDate {
                    detailRow(
                        icon: "calendar",
                        title: "Target Date",
                        value: targetDate.formatted(date: .long, time: .omitted),
                        isOverdue: targetDate < Date() && goal.status == .active
                    )
                    Divider()
                }

                detailRow(
                    icon: "clock",
                    title: "Created",
                    value: goal.createdAt.formatted(date: .abbreviated, time: .shortened)
                )
                Divider()

                detailRow(
                    icon: "arrow.clockwise",
                    title: "Last Updated",
                    value: goal.updatedAt.formatted(date: .abbreviated, time: .shortened)
                )

                if goal.lastSyncedAt == nil {
                    Divider()
                    detailRow(
                        icon: "icloud.slash",
                        title: "Sync Status",
                        value: "Not synced",
                        isWarning: true
                    )
                }
            }
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    private func detailRow(icon: String, title: String, value: String, isOverdue: Bool = false, isWarning: Bool = false) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(isOverdue ? .red : (isWarning ? .orange : .secondary))
                .frame(width: 24)

            Text(title)
                .foregroundColor(.secondary)

            Spacer()

            Text(value)
                .foregroundColor(isOverdue ? .red : (isWarning ? .orange : .primary))
        }
        .padding()
    }

    // MARK: - Parent Goal Section

    private var parentGoalSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Parent Goal")
                .font(.headline)

            if isLoadingLinks {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Loading...")
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else if let parent = parentGoal {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: "link")
                                .font(.caption)
                                .foregroundColor(.indigo)
                            Text(parent.title)
                                .font(.body)
                                .fontWeight(.medium)
                        }

                        HStack {
                            ProgressView(value: Double(parent.progressPercentage), total: 100)
                                .tint(.indigo)
                            Text("\(parent.progressPercentage)%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Spacer()

                    if onUnlink != nil {
                        Button {
                            unlinkGoal()
                        } label: {
                            if isUnlinking {
                                ProgressView()
                                    .scaleEffect(0.7)
                            } else {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                        .disabled(isUnlinking)
                    }
                }
                .padding()
                .background(Color.indigo.opacity(0.1))
                .cornerRadius(12)
            } else {
                HStack {
                    Text("Not linked to any goal")
                        .foregroundColor(.secondary)

                    Spacer()

                    if onLink != nil {
                        Button {
                            showingLinkSheet = true
                        } label: {
                            Label("Link", systemImage: "link.badge.plus")
                                .font(.caption)
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Child Goals Section

    private var childGoalsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Linked Short-term Goals")
                .font(.headline)

            if isLoadingLinks {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Loading...")
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else if childGoals.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "link")
                        .font(.title2)
                        .foregroundColor(.secondary)
                    Text("No linked goals")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            } else {
                VStack(spacing: 8) {
                    ForEach(childGoals) { child in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(child.title)
                                    .font(.subheadline)
                                    .lineLimit(1)

                                HStack {
                                    ProgressView(value: Double(child.progressPercentage), total: 100)
                                        .tint(.orange)
                                    Text("\(child.progressPercentage)%")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            Text(child.status.displayName)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.orange.opacity(0.2))
                                .foregroundColor(.orange)
                                .cornerRadius(4)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.orange.opacity(0.05))
                        .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
    }

    // MARK: - Linked Journals Section (Placeholder)

    private var linkedJournalsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Linked Journals")
                .font(.headline)

            VStack(spacing: 12) {
                Image(systemName: "doc.text")
                    .font(.title)
                    .foregroundColor(.secondary)

                Text("No journal entries linked yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Text("Journal entries referencing this goal will appear here")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }

    // MARK: - Actions

    private func loadLinkedGoals() async {
        isLoadingLinks = true
        defer { isLoadingLinks = false }

        do {
            if goal.type == .shortTerm, let parentId = goal.parentGoalId {
                parentGoal = try await repository.getGoal(parentId)
            } else if goal.type == .longTerm {
                childGoals = try await repository.getChildGoals(parentId: goal.id)
            }
        } catch {
            print("Failed to load linked goals: \(error)")
        }
    }

    private func unlinkGoal() {
        guard let unlinkAction = onUnlink else { return }

        isUnlinking = true
        Task {
            do {
                try await unlinkAction()
                parentGoal = nil
            } catch {
                linkError = error.localizedDescription
            }
            isUnlinking = false
        }
    }
}

#Preview {
    NavigationView {
        GoalDetailView(
            goal: Goal(
                userId: UUID(),
                title: "Learn SwiftUI",
                description: "Master SwiftUI for iOS development including animations, gestures, and advanced layouts",
                type: .longTerm,
                category: "Learning",
                targetDate: Date().addingTimeInterval(86400 * 90),
                status: .active,
                progressPercentage: 65
            ),
            onEdit: { },
            onDelete: { }
        )
    }
}
