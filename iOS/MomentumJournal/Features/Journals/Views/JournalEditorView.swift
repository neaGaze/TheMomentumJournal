//
//  JournalEditorView.swift
//  MomentumJournal
//

import SwiftUI

struct JournalEditorView: View {
    @StateObject private var viewModel: JournalEditorViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var showingGoalPicker = false

    let onSave: (JournalEntry) -> Void

    init(entry: JournalEntry? = nil, onSave: @escaping (JournalEntry) -> Void) {
        _viewModel = StateObject(wrappedValue: JournalEditorViewModel(entry: entry))
        self.onSave = onSave
    }

    var body: some View {
        NavigationView {
            Form {
                // Title Section
                Section {
                    TextField("Title (optional)", text: $viewModel.title)
                        .textInputAutocapitalization(.sentences)
                }

                // Content Section
                Section {
                    TextEditor(text: $viewModel.content)
                        .frame(minHeight: 200)

                    HStack {
                        if viewModel.isAutoSaving {
                            HStack(spacing: 4) {
                                ProgressView()
                                    .scaleEffect(0.7)
                                Text("Saving draft...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        Text(viewModel.contentLengthDisplay)
                            .font(.caption)
                            .foregroundColor(viewModel.isNearLimit ? (viewModel.isOverLimit ? .red : .orange) : .secondary)
                    }
                } header: {
                    Text("Content")
                } footer: {
                    if let error = viewModel.validationError, error.contains("Content") {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }

                // Date Section
                Section("Entry Date") {
                    DatePicker(
                        "Date",
                        selection: $viewModel.entryDate,
                        displayedComponents: [.date, .hourAndMinute]
                    )
                }

                // Mood Section
                Section("How are you feeling?") {
                    MoodSelectorView(selectedMood: $viewModel.mood)
                }

                // Tags Section
                Section("Tags") {
                    TagInputView(tags: $viewModel.tags)
                }

                // Link Goals Section
                Section {
                    Button {
                        showingGoalPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "link")
                            Text("Link to Goals")
                            Spacer()
                            if !viewModel.linkedGoalIds.isEmpty {
                                Text("\(viewModel.linkedGoalIds.count) linked")
                                    .foregroundColor(.secondary)
                            }
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }

                    // Show linked goals
                    if !viewModel.linkedGoalIds.isEmpty {
                        ForEach(viewModel.availableGoals.filter { viewModel.linkedGoalIds.contains($0.id) }) { goal in
                            HStack {
                                Text(goal.title)
                                    .font(.subheadline)
                                Spacer()
                                Button {
                                    viewModel.toggleGoalLink(goal.id)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Goals")
                }

                // Error display
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle(viewModel.isEditing ? "Edit Entry" : "New Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveEntry()
                    }
                    .disabled(viewModel.isSaving || viewModel.content.isEmpty || viewModel.isOverLimit)
                }
            }
            .disabled(viewModel.isSaving)
            .overlay {
                if viewModel.isSaving {
                    ProgressView("Saving...")
                        .padding()
                        .background(.regularMaterial)
                        .cornerRadius(12)
                }
            }
            .sheet(isPresented: $showingGoalPicker) {
                GoalPickerView(
                    goals: viewModel.availableGoals,
                    selectedIds: $viewModel.linkedGoalIds
                )
            }
            .task {
                await viewModel.loadGoals()
            }
        }
    }

    // MARK: - Actions

    private func saveEntry() {
        Task {
            do {
                let saved = try await viewModel.save()
                onSave(saved)
                dismiss()
            } catch {
                // Error already set in viewModel
            }
        }
    }
}

// MARK: - Goal Picker View

struct GoalPickerView: View {
    let goals: [Goal]
    @Binding var selectedIds: [UUID]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            List {
                if goals.isEmpty {
                    Text("No goals available")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(goals) { goal in
                        Button {
                            toggleSelection(goal.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(goal.title)
                                        .foregroundColor(.primary)

                                    Text(goal.type.displayName)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                if selectedIds.contains(goal.id) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.blue)
                                } else {
                                    Image(systemName: "circle")
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Link Goals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func toggleSelection(_ id: UUID) {
        if selectedIds.contains(id) {
            selectedIds.removeAll { $0 == id }
        } else {
            selectedIds.append(id)
        }
    }
}

#Preview("New Entry") {
    JournalEditorView { _ in }
}

#Preview("Edit Entry") {
    JournalEditorView(entry: JournalEntry(
        userId: UUID(),
        title: "Sample Entry",
        content: "This is a sample journal entry with some content to preview.",
        entryDate: Date(),
        mood: .good,
        tags: ["personal", "work"]
    )) { _ in }
}
