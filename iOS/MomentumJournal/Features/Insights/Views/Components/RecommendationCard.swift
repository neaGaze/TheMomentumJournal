//
//  RecommendationCard.swift
//  MomentumJournal
//

import SwiftUI

struct RecommendationCard: View {
    let recommendation: Recommendation
    let onGoalTap: ((UUID) -> Void)?

    @State private var isExpanded = false

    init(recommendation: Recommendation, onGoalTap: ((UUID) -> Void)? = nil) {
        self.recommendation = recommendation
        self.onGoalTap = onGoalTap
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header with expand/collapse
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(.purple)

                    Text(recommendation.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)

            // Expanded content
            if isExpanded {
                Text(recommendation.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.leading, 28)

                // Related goal pill
                if let goalId = recommendation.relatedGoalId {
                    Button {
                        onGoalTap?(goalId)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "target")
                                .font(.caption2)
                            Text("View Related Goal")
                                .font(.caption)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.green.opacity(0.15))
                        .foregroundColor(.green)
                        .cornerRadius(8)
                    }
                    .padding(.leading, 28)
                    .padding(.top, 4)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.03), radius: 4, x: 0, y: 1)
    }
}

#Preview {
    VStack(spacing: 12) {
        RecommendationCard(
            recommendation: Recommendation(
                title: "Try morning journaling",
                description: "Based on your patterns, journaling in the morning might help you set clearer intentions for the day.",
                relatedGoalId: UUID()
            )
        )

        RecommendationCard(
            recommendation: Recommendation(
                title: "Focus on one goal at a time",
                description: "You have multiple active goals. Consider prioritizing one to make faster progress."
            )
        )
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
