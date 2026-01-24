//
//  JournalDetailView.swift
//  MomentumJournal
//

import SwiftUI

struct JournalDetailView: View {
    let entry: JournalEntry
    let onEdit: () -> Void

    @State private var linkedGoals: [Goal] = []
    @State private var selectedGoal: Goal?
    @Environment(\.dismiss) private var dismiss

    private let goalsRepository = GoalsRepository()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                headerSection

                Divider()

                // Content
                contentSection

                // Mood
                if let mood = entry.mood {
                    moodSection(mood)
                }

                // Tags
                if !entry.tags.isEmpty {
                    tagsSection
                }

                // Linked Goals
                if !entry.linkedGoalIds.isEmpty {
                    linkedGoalsSection
                }

                // Metadata
                metadataSection
            }
            .padding()
        }
        .navigationTitle("Journal Entry")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Edit") {
                    dismiss()
                    onEdit()
                }
            }

            ToolbarItem(placement: .navigationBarLeading) {
                Button("Done") {
                    dismiss()
                }
            }
        }
        .sheet(item: $selectedGoal) { goal in
            NavigationView {
                GoalDetailView(goal: goal, onEdit: {}, onDelete: {})
            }
        }
        .task {
            await loadLinkedGoals()
        }
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = entry.title, !title.isEmpty {
                Text(title)
                    .font(.title)
                    .fontWeight(.bold)
            }

            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.secondary)

                Text(entry.entryDate.formatted(date: .long, time: .shortened))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Content Section

    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(entry.content)
                .font(.body)
                .lineSpacing(4)
        }
    }

    // MARK: - Mood Section

    private func moodSection(_ mood: Mood) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Mood")
                .font(.headline)

            HStack(spacing: 8) {
                Text(mood.emoji)
                    .font(.title)

                Text(mood.displayName)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(moodColor(mood).opacity(0.1))
            .cornerRadius(12)
        }
    }

    private func moodColor(_ mood: Mood) -> Color {
        switch mood {
        case .great: return .green
        case .good: return .blue
        case .neutral: return .gray
        case .bad: return .orange
        case .terrible: return .red
        }
    }

    // MARK: - Tags Section

    private var tagsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tags")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(entry.tags, id: \.self) { tag in
                    Text(tag)
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(16)
                }
            }
        }
    }

    // MARK: - Linked Goals Section

    private var linkedGoalsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Linked Goals")
                .font(.headline)

            if linkedGoals.isEmpty {
                Text("Loading goals...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(linkedGoals) { goal in
                        Button {
                            selectedGoal = goal
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "target")
                                    .font(.caption)

                                Text(goal.title)
                                    .font(.subheadline)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.purple.opacity(0.1))
                            .foregroundColor(.purple)
                            .cornerRadius(16)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Metadata Section

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Divider()
                .padding(.vertical, 8)

            Text("Created: \(entry.createdAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption)
                .foregroundColor(.secondary)

            Text("Updated: \(entry.updatedAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Load Linked Goals

    private func loadLinkedGoals() async {
        var goals: [Goal] = []

        for goalId in entry.linkedGoalIds {
            if let goal = try? await goalsRepository.getGoal(goalId) {
                goals.append(goal)
            }
        }

        linkedGoals = goals
    }
}

#Preview {
    NavigationView {
        JournalDetailView(
            entry: JournalEntry(
                userId: UUID(),
                title: "A Great Day",
                content: "Today was an amazing day. I accomplished so much and felt really productive. The weather was perfect, and I had a great time with friends.\n\nI also made progress on my personal goals which felt really rewarding.",
                entryDate: Date(),
                mood: .great,
                tags: ["productive", "friends", "outdoors"],
                linkedGoalIds: [UUID()]
            ),
            onEdit: {}
        )
    }
}
