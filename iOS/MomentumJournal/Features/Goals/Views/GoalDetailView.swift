//
//  GoalDetailView.swift
//  MomentumJournal
//

import SwiftUI

struct GoalDetailView: View {
    let goal: Goal
    let onEdit: () -> Void
    let onDelete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showingDeleteConfirmation = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                headerSection

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
