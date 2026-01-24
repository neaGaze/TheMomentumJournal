//
//  InsightsView.swift
//  MomentumJournal
//

import SwiftUI

struct InsightsView: View {
    @StateObject private var viewModel = InsightsViewModel()
    @State private var selectedGoal: Goal?
    @State private var showingGoalDetail = false

    private let goalsRepository = GoalsRepository()

    var body: some View {
        NavigationView {
            ZStack {
                content
                    .background(Color(.systemGroupedBackground))

                // Generation overlay
                if viewModel.isGenerating {
                    generatingOverlay
                }
            }
            .navigationTitle("AI Insights")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { await viewModel.generateNewInsights() }
                    } label: {
                        Image(systemName: "sparkles")
                    }
                    .disabled(viewModel.isGenerating)
                }
            }
            .refreshable {
                await viewModel.loadInsights()
            }
            .task {
                await viewModel.loadInsights()
            }
            .sheet(isPresented: $showingGoalDetail) {
                if let goal = selectedGoal {
                    NavigationView {
                        GoalDetailView(goal: goal, onEdit: {}, onDelete: {})
                    }
                }
            }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.insights == nil {
            loadingView
        } else if let error = viewModel.errorMessage, viewModel.insights == nil {
            errorView(error)
        } else if let insights = viewModel.insights {
            insightsContent(insights)
        } else {
            emptyView
        }
    }

    // MARK: - Insights Content

    private func insightsContent(_ insights: AIInsights) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Timeline Picker
                timelinePicker

                // Generated timestamp
                if let timeAgo = viewModel.generatedTimeAgo {
                    HStack {
                        Image(systemName: "clock")
                            .font(.caption)
                        Text(timeAgo)
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }

                // Summary Card
                InsightSummaryCard(summary: insights.summary)

                // Sentiment Card
                sentimentCard(insights.sentiment)

                // Themes Section
                if !insights.themes.isEmpty {
                    themesSection(insights.themes)
                }

                // Patterns Section
                if !insights.patterns.isEmpty {
                    patternsSection(insights.patterns)
                }

                // Recommendations Section
                if !insights.recommendations.isEmpty {
                    recommendationsSection(insights.recommendations)
                }

                // Goal Progress Updates
                if !insights.goalProgressUpdates.isEmpty {
                    goalProgressSection(insights.goalProgressUpdates)
                }
            }
            .padding()
        }
    }

    // MARK: - Timeline Picker

    private var timelinePicker: some View {
        Picker("Timeline", selection: $viewModel.selectedTimeline) {
            ForEach(InsightsTimeline.allCases, id: \.self) { timeline in
                Text(timeline.displayName).tag(timeline)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: viewModel.selectedTimeline) { _ in
            Task { await viewModel.timelineChanged() }
        }
    }

    // MARK: - Sentiment Card

    private func sentimentCard(_ sentiment: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: viewModel.sentimentEmoji)
                .font(.title)
                .foregroundColor(.orange)

            VStack(alignment: .leading, spacing: 4) {
                Text("Overall Sentiment")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(sentiment.capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
    }

    // MARK: - Themes Section

    private func themesSection(_ themes: [String]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Themes")
                .font(.headline)
                .padding(.horizontal, 4)

            FlowLayout(spacing: 8) {
                ForEach(themes, id: \.self) { theme in
                    Text(theme)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.15))
                        .foregroundColor(.blue)
                        .cornerRadius(16)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Patterns Section

    private func patternsSection(_ patterns: [Pattern]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Patterns")
                .font(.headline)
                .padding(.horizontal, 4)

            VStack(spacing: 0) {
                ForEach(Array(patterns.enumerated()), id: \.element.id) { index, pattern in
                    PatternItemView(pattern: pattern)

                    if index < patterns.count - 1 {
                        Divider()
                    }
                }
            }
            .padding(.horizontal)
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
        }
    }

    // MARK: - Recommendations Section

    private func recommendationsSection(_ recommendations: [Recommendation]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recommendations")
                .font(.headline)
                .padding(.horizontal, 4)

            ForEach(recommendations) { recommendation in
                RecommendationCard(recommendation: recommendation) { goalId in
                    handleGoalTap(goalId)
                }
            }
        }
    }

    // MARK: - Goal Progress Section

    private func goalProgressSection(_ updates: [GoalProgressUpdate]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Goal Progress")
                .font(.headline)
                .padding(.horizontal, 4)

            ForEach(updates) { update in
                GoalProgressCard(update: update) { goalId in
                    handleGoalTap(goalId)
                }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        LoadingView("Loading insights...")
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        ErrorView(message) {
            Task { await viewModel.loadInsights() }
        }
    }

    // MARK: - Empty View

    private var emptyView: some View {
        VStack(spacing: 20) {
            // Timeline Picker at top
            timelinePicker
                .padding(.horizontal)
                .padding(.top)

            Spacer()

            EmptyStateView(
                icon: "brain.head.profile",
                message: "No Insights Yet\nGenerate AI insights based on your journals and goals",
                actionTitle: "Generate Insights"
            ) {
                Task { await viewModel.generateNewInsights() }
            }

            Spacer()
        }
    }

    // MARK: - Generating Overlay

    private var generatingOverlay: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)

                Text("Generating insights...")
                    .font(.headline)
                    .foregroundColor(.white)

                Text("This may take 10-30 seconds")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(40)
            .background(.ultraThinMaterial)
            .cornerRadius(20)
        }
    }

    // MARK: - Handle Goal Tap

    private func handleGoalTap(_ goalId: UUID) {
        Task {
            if let goal = try? await goalsRepository.getGoal(goalId) {
                selectedGoal = goal
                showingGoalDetail = true
            }
        }
    }
}


#Preview {
    InsightsView()
}
