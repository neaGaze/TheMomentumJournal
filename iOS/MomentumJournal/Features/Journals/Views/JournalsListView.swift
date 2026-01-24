//
//  JournalsListView.swift
//  MomentumJournal
//

import SwiftUI

struct JournalsListView: View {
    @StateObject private var viewModel = JournalsListViewModel()
    @State private var showingAddJournal = false
    @State private var selectedJournal: JournalEntry?
    @State private var showingFilters = false
    @State private var journalToEdit: JournalEntry?

    var body: some View {
        NavigationView {
            ZStack {
                content
                addButton
            }
            .navigationTitle("Journal")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    filterButton
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Search entries")
            .onChange(of: viewModel.searchText) { _ in
                viewModel.applyFilters()
            }
            .sheet(isPresented: $showingAddJournal) {
                JournalEditorView { _ in
                    Task { await viewModel.loadJournals() }
                }
            }
            .sheet(item: $journalToEdit) { entry in
                JournalEditorView(entry: entry) { _ in
                    Task { await viewModel.loadJournals() }
                }
            }
            .sheet(item: $selectedJournal) { entry in
                NavigationView {
                    JournalDetailView(entry: entry) {
                        journalToEdit = entry
                        selectedJournal = nil
                    }
                }
            }
            .confirmationDialog("Filter Journals", isPresented: $showingFilters) {
                filterOptions
            }
            .refreshable {
                await viewModel.loadJournals()
            }
            .task {
                await viewModel.loadJournals()
            }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.journals.isEmpty {
            LoadingView("Loading journals...")
        } else if let error = viewModel.errorMessage {
            ErrorView(error) {
                Task { await viewModel.loadJournals() }
            }
        } else if viewModel.filteredJournals.isEmpty {
            emptyView
        } else {
            journalsList
        }
    }

    // MARK: - Journals List

    private var journalsList: some View {
        List {
            ForEach(viewModel.orderedSections, id: \.self) { section in
                if let entries = viewModel.journalsBySection[section] {
                    Section(section.rawValue) {
                        ForEach(entries) { entry in
                            JournalRow(entry: entry)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedJournal = entry
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task { await viewModel.deleteJournal(entry.id) }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                                .swipeActions(edge: .leading) {
                                    Button {
                                        journalToEdit = entry
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
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
                icon: "book.closed",
                message: "No Journal Entries\nTap + to write your first entry"
            )

            if viewModel.filterMood != nil || viewModel.filterDateRange != nil || viewModel.filterGoalId != nil {
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
                    showingAddJournal = true
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
            Image(systemName: hasActiveFilters
                  ? "line.3.horizontal.decrease.circle.fill"
                  : "line.3.horizontal.decrease.circle")
        }
    }

    private var hasActiveFilters: Bool {
        viewModel.filterMood != nil ||
        viewModel.filterDateRange != nil ||
        viewModel.filterGoalId != nil
    }

    // MARK: - Filter Options

    @ViewBuilder
    private var filterOptions: some View {
        Button("All Entries") {
            viewModel.clearFilters()
        }

        // Mood filters
        ForEach(Mood.allCases, id: \.self) { mood in
            Button("\(mood.emoji) \(mood.displayName)") {
                viewModel.filterMood = mood
                viewModel.filterDateRange = nil
                viewModel.applyFilters()
            }
        }

        // Date range filters
        Button("Today") {
            viewModel.filterMood = nil
            viewModel.filterDateRange = .today
            viewModel.applyFilters()
        }

        Button("This Week") {
            viewModel.filterMood = nil
            viewModel.filterDateRange = .week
            viewModel.applyFilters()
        }

        Button("This Month") {
            viewModel.filterMood = nil
            viewModel.filterDateRange = .month
            viewModel.applyFilters()
        }

        Button("Cancel", role: .cancel) { }
    }
}

// MARK: - Journal Row

struct JournalRow: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // Title or content preview
                Text(entry.title ?? contentPreview)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                // Mood emoji
                if let mood = entry.mood {
                    Text(mood.emoji)
                        .font(.title3)
                }
            }

            // Content preview (if title exists)
            if entry.title != nil {
                Text(contentPreview)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            // Tags
            if !entry.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(entry.tags.prefix(5), id: \.self) { tag in
                            Text(tag)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.1))
                                .foregroundColor(.blue)
                                .cornerRadius(8)
                        }
                        if entry.tags.count > 5 {
                            Text("+\(entry.tags.count - 5)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            // Date
            HStack {
                Text(entry.entryDate.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if !entry.linkedGoalIds.isEmpty {
                    Label("\(entry.linkedGoalIds.count)", systemImage: "link")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var contentPreview: String {
        let trimmed = entry.content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count > 100 {
            return String(trimmed.prefix(100)) + "..."
        }
        return trimmed
    }
}

#Preview {
    JournalsListView()
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
