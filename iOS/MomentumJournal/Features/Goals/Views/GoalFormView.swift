//
//  GoalFormView.swift
//  MomentumJournal
//

import SwiftUI

struct GoalFormView: View {
    @StateObject private var viewModel: GoalFormViewModel
    @Environment(\.dismiss) private var dismiss

    let onSave: (Goal) -> Void

    init(goal: Goal? = nil, onSave: @escaping (Goal) -> Void) {
        _viewModel = StateObject(wrappedValue: GoalFormViewModel(goal: goal))
        self.onSave = onSave
    }

    var body: some View {
        NavigationView {
            Form {
                // Title Section
                Section {
                    TextField("Goal Title", text: $viewModel.title)
                        .textInputAutocapitalization(.sentences)
                } header: {
                    Text("Title")
                } footer: {
                    if let error = viewModel.validationError, error.contains("Title") {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }

                // Description Section
                Section("Description") {
                    TextEditor(text: $viewModel.description)
                        .frame(minHeight: 100)
                }

                // Type & Category Section
                Section("Classification") {
                    Picker("Type", selection: $viewModel.type) {
                        ForEach(GoalType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }

                    TextField("Category (optional)", text: $viewModel.category)
                        .textInputAutocapitalization(.words)
                }

                // Target Date Section
                Section {
                    Toggle("Set Target Date", isOn: $viewModel.hasTargetDate)

                    if viewModel.hasTargetDate {
                        DatePicker(
                            "Target Date",
                            selection: Binding(
                                get: { viewModel.targetDate ?? Date() },
                                set: { viewModel.targetDate = $0 }
                            ),
                            displayedComponents: .date
                        )
                    }
                } header: {
                    Text("Target Date")
                }

                // Status Section
                Section("Status") {
                    Picker("Status", selection: $viewModel.status) {
                        ForEach(GoalStatus.allCases, id: \.self) { status in
                            Text(status.displayName).tag(status)
                        }
                    }
                }

                // Progress Section
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Progress")
                            Spacer()
                            Text("\(Int(viewModel.progressPercentage))%")
                                .foregroundColor(.secondary)
                        }

                        Slider(value: $viewModel.progressPercentage, in: 0...100, step: 1)
                            .tint(progressColor)

                        ProgressView(value: viewModel.progressPercentage, total: 100)
                            .tint(progressColor)
                    }
                } header: {
                    Text("Progress")
                }

                // Error display
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle(viewModel.isEditing ? "Edit Goal" : "New Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveGoal()
                    }
                    .disabled(viewModel.isSaving || viewModel.title.isEmpty)
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
        }
    }

    // MARK: - Actions

    private func saveGoal() {
        Task {
            do {
                let savedGoal = try await viewModel.save()
                onSave(savedGoal)
                dismiss()
            } catch {
                // Error is already set in viewModel
            }
        }
    }

    // MARK: - Helpers

    private var progressColor: Color {
        switch Int(viewModel.progressPercentage) {
        case 0..<25: return .red
        case 25..<50: return .orange
        case 50..<75: return .yellow
        case 75..<100: return .green
        default: return .blue
        }
    }
}

#Preview("New Goal") {
    GoalFormView { _ in }
}

#Preview("Edit Goal") {
    GoalFormView(goal: Goal(
        userId: UUID(),
        title: "Sample Goal",
        description: "This is a sample goal",
        type: .longTerm,
        category: "Personal",
        targetDate: Date().addingTimeInterval(86400 * 30),
        status: .active,
        progressPercentage: 45
    )) { _ in }
}
