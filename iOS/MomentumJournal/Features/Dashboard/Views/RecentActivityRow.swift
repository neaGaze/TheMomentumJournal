//
//  RecentActivityRow.swift
//  MomentumJournal
//

import SwiftUI

struct RecentActivityRow: View {
    let activity: RecentActivityItem
    var onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: 12) {
                // Icon
                Image(systemName: activity.type.icon)
                    .font(.body)
                    .foregroundColor(iconColor)
                    .frame(width: 32, height: 32)
                    .background(iconColor.opacity(0.15))
                    .cornerRadius(8)

                // Title & Type
                VStack(alignment: .leading, spacing: 2) {
                    Text(activity.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)

                    Text(activityTypeLabel)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Timestamp
                Text(relativeTime)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Computed Properties

    private var iconColor: Color {
        switch activity.type {
        case .goal:
            return .green
        case .journal:
            return .purple
        }
    }

    private var activityTypeLabel: String {
        switch activity.type {
        case .goal:
            return "Goal"
        case .journal:
            return "Journal"
        }
    }

    private var relativeTime: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: activity.timestamp, relativeTo: Date())
    }
}

// MARK: - Preview

#Preview {
    Text("Preview requires API data")
}
