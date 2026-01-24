//
//  GoalsListView.swift
//  MomentumJournal
//

import SwiftUI

struct GoalsListView: View {
    @StateObject private var viewModel = GoalsListViewModel()
    @State private var showingAddGoal = false
    @State private var selectedGoal: Goal?
    @State private var showingFilters = false

    var body: some View {
        NavigationView {
            ZStack {
                content
                addButton
            }
            .navigationTitle("Goals")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    filterButton
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Search goals")
            .onChange(of: viewModel.searchText) { _ in
                viewModel.applyFilters()
            }
            .sheet(isPresented: $showingAddGoal) {
                GoalFormView { _ in
                    Task { await viewModel.loadGoals() }
                }
            }
            .sheet(item: $selectedGoal) { goal in
                GoalFormView(goal: goal) { _ in
                    Task { await viewModel.loadGoals() }
                }
            }
            .confirmationDialog("Filter Goals", isPresented: $showingFilters) {
                filterOptions
            }
            .refreshable {
                await viewModel.loadGoals()
            }
            .task {
                await viewModel.loadGoals()
            }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.goals.isEmpty {
            LoadingView("Loading goals...")
        } else if let error = viewModel.errorMessage {
            ErrorView(error) {
                Task { await viewModel.loadGoals() }
            }
        } else if viewModel.filteredGoals.isEmpty {
            emptyView
        } else {
            goalsList
        }
    }

    // MARK: - Goals List

    private var goalsList: some View {
        List {
            // Active goals section
            let activeGoals = viewModel.filteredGoals.filter { $0.status == .active }
            if !activeGoals.isEmpty {
                Section("Active") {
                    ForEach(activeGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteGoal(goal.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                            .swipeActions(edge: .leading) {
                                Button {
                                    selectedGoal = goal
                                } label: {
                                    Label("Edit", systemImage: "pencil")
                                }
                                .tint(.blue)
                            }
                    }
                }
            }

            // Completed goals section
            let completedGoals = viewModel.filteredGoals.filter { $0.status == .completed }
            if !completedGoals.isEmpty {
                Section("Completed") {
                    ForEach(completedGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteGoal(goal.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }

            // Paused goals section
            let pausedGoals = viewModel.filteredGoals.filter { $0.status == .paused }
            if !pausedGoals.isEmpty {
                Section("Paused") {
                    ForEach(pausedGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteGoal(goal.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }

            // Abandoned goals section
            let abandonedGoals = viewModel.filteredGoals.filter { $0.status == .abandoned }
            if !abandonedGoals.isEmpty {
                Section("Abandoned") {
                    ForEach(abandonedGoals) { goal in
                        GoalRow(goal: goal)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedGoal = goal
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task { await viewModel.deleteGoal(goal.id) }
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 16) {
            EmptyStateView(
                icon: "target",
                message: "No Goals Yet\nTap + to create your first goal"
            )

            if viewModel.filterType != nil || viewModel.filterStatus != nil {
                Button("Clear Filters") {
                    viewModel.clearFilters()
                }
                .buttonStyle(.bordered)
            }
        }
    }

    // MARK: - Add Button (FAB)

    private var addButton: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                Button {
                    showingAddGoal = true
                } label: {
                    Image(systemName: "plus")
                        .font(.title2.weight(.semibold))
                        .foregroundColor(.white)
                        .frame(width: 56, height: 56)
                        .background(Color.blue)
                        .clipShape(Circle())
                        .shadow(radius: 4)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 20)
            }
        }
    }

    // MARK: - Filter Button

    private var filterButton: some View {
        Button {
            showingFilters = true
        } label: {
            Image(systemName: viewModel.filterType != nil || viewModel.filterStatus != nil
                  ? "line.3.horizontal.decrease.circle.fill"
                  : "line.3.horizontal.decrease.circle")
        }
    }

    // MARK: - Filter Options

    @ViewBuilder
    private var filterOptions: some View {
        Button("All Goals") {
            viewModel.clearFilters()
        }

        // Type filters
        Button("Long-term Goals") {
            viewModel.filterType = .longTerm
            viewModel.filterStatus = nil
            viewModel.applyFilters()
        }
        Button("Short-term Goals") {
            viewModel.filterType = .shortTerm
            viewModel.filterStatus = nil
            viewModel.applyFilters()
        }

        // Status filters
        Button("Active Only") {
            viewModel.filterType = nil
            viewModel.filterStatus = .active
            viewModel.applyFilters()
        }
        Button("Completed Only") {
            viewModel.filterType = nil
            viewModel.filterStatus = .completed
            viewModel.applyFilters()
        }

        Button("Cancel", role: .cancel) { }
    }
}

// MARK: - Goal Row

struct GoalRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(goal.title)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                typeTag
            }

            if let description = goal.description, !description.isEmpty {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            HStack {
                // Progress bar
                ProgressView(value: Double(goal.progressPercentage), total: 100)
                    .tint(progressColor)

                Text("\(goal.progressPercentage)%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack {
                if let category = goal.category {
                    Label(category, systemImage: "tag")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if let targetDate = goal.targetDate {
                    Label(targetDate.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                        .font(.caption)
                        .foregroundColor(isOverdue ? .red : .secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var typeTag: some View {
        Text(goal.type.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(goal.type == .longTerm ? Color.purple.opacity(0.2) : Color.green.opacity(0.2))
            .foregroundColor(goal.type == .longTerm ? .purple : .green)
            .cornerRadius(8)
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

    private var isOverdue: Bool {
        guard let targetDate = goal.targetDate else { return false }
        return targetDate < Date() && goal.status == .active
    }
}

#Preview {
    GoalsListView()
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
