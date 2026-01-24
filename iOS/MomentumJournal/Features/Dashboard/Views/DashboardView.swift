//
//  DashboardView.swift
//  MomentumJournal
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var selectedGoal: Goal?
    @State private var selectedJournalEntry: JournalEntry?
    @State private var showingGoalDetail = false
    @State private var showingJournalDetail = false

    private let goalsRepository = GoalsRepository()
    private let journalsRepository = JournalsRepository()

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Timeline Picker
                    timelinePicker

                    // Content
                    content
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadStats()
            }
            .sheet(isPresented: $showingGoalDetail) {
                if let goal = selectedGoal {
                    NavigationView {
                        GoalDetailView(goal: goal, onEdit: {}, onDelete: {})
                    }
                }
            }
            .sheet(isPresented: $showingJournalDetail) {
                if let entry = selectedJournalEntry {
                    NavigationView {
                        JournalDetailView(entry: entry, onEdit: {})
                    }
                }
            }
        }
    }

    // MARK: - Timeline Picker

    private var timelinePicker: some View {
        Picker("Timeline", selection: $viewModel.selectedTimeline) {
            ForEach(Timeline.allCases, id: \.self) { timeline in
                Text(timeline.displayName).tag(timeline)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: viewModel.selectedTimeline) { _ in
            Task {
                await viewModel.timelineChanged()
            }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.stats == nil {
            loadingView
        } else if let error = viewModel.errorMessage, viewModel.stats == nil {
            errorView(error)
        } else if let stats = viewModel.stats {
            statsContent(stats)
        } else {
            emptyView
        }
    }

    // MARK: - Stats Content

    private func statsContent(_ stats: DashboardStats) -> some View {
        VStack(spacing: 24) {
            // Stats Cards Grid
            LazyVGrid(columns: columns, spacing: 16) {
                StatsCardView(
                    icon: "chart.bar.fill",
                    title: "Total Goals",
                    value: "\(stats.goals.totalGoals)",
                    color: .blue
                )

                StatsCardView(
                    icon: "target",
                    title: "Active Goals",
                    value: "\(stats.goals.activeGoals)",
                    color: .green
                )

                StatsCardView(
                    icon: "book.fill",
                    title: "Total Journals",
                    value: "\(stats.journals.totalJournals)",
                    subtitle: "\(stats.journals.entriesThisWeek) this week",
                    color: .purple
                )

                StatsCardView(
                    icon: "flame.fill",
                    title: "Current Streak",
                    value: "\(stats.journals.currentStreak)",
                    subtitle: "Longest: \(stats.journals.longestStreak)",
                    color: .orange
                )
            }

            // Additional Stats Row
            HStack(spacing: 16) {
                statPill(
                    icon: "checkmark.circle.fill",
                    label: "Completed",
                    value: "\(stats.goals.completedGoals)",
                    color: .green
                )

                statPill(
                    icon: "percent",
                    label: "Avg Progress",
                    value: "\(stats.goals.averageProgress)%",
                    color: .blue
                )
            }

            // Recent Activity Section
            recentActivitySection(stats.recentActivity)
        }
    }

    // MARK: - Stat Pill

    private func statPill(icon: String, label: String, value: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
    }

    // MARK: - Recent Activity Section

    private func recentActivitySection(_ activities: [RecentActivityItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Activity")
                .font(.headline)
                .padding(.horizontal, 4)

            if activities.isEmpty {
                emptyActivityView
            } else {
                VStack(spacing: 0) {
                    ForEach(activities.prefix(10)) { activity in
                        RecentActivityRow(activity: activity) {
                            handleActivityTap(activity)
                        }

                        if activity.id != activities.prefix(10).last?.id {
                            Divider()
                                .padding(.leading, 44)
                        }
                    }
                }
                .padding(.horizontal)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
            }
        }
    }

    // MARK: - Empty Activity View

    private var emptyActivityView: some View {
        VStack(spacing: 12) {
            Image(systemName: "clock")
                .font(.title)
                .foregroundColor(.secondary)

            Text("No recent activity")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    // MARK: - Loading View

    private var loadingView: some View {
        LoadingView("Loading dashboard...")
            .frame(minHeight: 300)
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        ErrorView(message) {
            Task { await viewModel.loadStats() }
        }
        .frame(minHeight: 300)
    }

    // MARK: - Empty View

    private var emptyView: some View {
        EmptyStateView(
            icon: "chart.bar.doc.horizontal",
            message: "No data available\nStart creating goals and journal entries to see your stats"
        )
        .frame(minHeight: 300)
    }

    // MARK: - Handle Activity Tap

    private func handleActivityTap(_ activity: RecentActivityItem) {
        Task {
            if activity.type.isGoal {
                if let goal = try? await goalsRepository.getGoal(activity.entityId) {
                    selectedGoal = goal
                    showingGoalDetail = true
                }
            } else {
                if let entry = try? await journalsRepository.getJournal(activity.entityId) {
                    selectedJournalEntry = entry
                    showingJournalDetail = true
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    DashboardView()
}
