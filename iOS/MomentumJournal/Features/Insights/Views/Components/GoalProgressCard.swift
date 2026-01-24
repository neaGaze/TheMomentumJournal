//
//  GoalProgressCard.swift
//  MomentumJournal
//

import SwiftUI

struct GoalProgressCard: View {
    let update: GoalProgressUpdate
    let onGoalTap: ((UUID) -> Void)?

    init(update: GoalProgressUpdate, onGoalTap: ((UUID) -> Void)? = nil) {
        self.update = update
        self.onGoalTap = onGoalTap
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Goal title (tappable)
            Button {
                onGoalTap?(update.goalId)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "target")
                        .font(.subheadline)
                        .foregroundColor(.green)

                    Text(update.goalTitle)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)

            // Observation
            Text(update.observation)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            // Suggested actions
            if !update.suggestedActions.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Suggested Actions")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)

                    ForEach(update.suggestedActions, id: \.self) { action in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "circle.fill")
                                .font(.system(size: 4))
                                .foregroundColor(.blue)
                                .padding(.top, 6)

                            Text(action)
                                .font(.caption)
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.green.opacity(0.3), lineWidth: 1)
        )
    }
}

#Preview {
    VStack(spacing: 12) {
        GoalProgressCard(
            update: GoalProgressUpdate(
                goalId: UUID(),
                goalTitle: "Learn SwiftUI",
                observation: "You've mentioned SwiftUI in 4 journal entries this week, showing consistent engagement with this goal.",
                suggestedActions: [
                    "Schedule dedicated learning time",
                    "Build a small project to practice",
                    "Review Apple's documentation"
                ]
            )
        )

        GoalProgressCard(
            update: GoalProgressUpdate(
                goalId: UUID(),
                goalTitle: "Exercise regularly",
                observation: "Limited mentions of exercise this week. Consider setting reminders.",
                suggestedActions: []
            )
        )
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
