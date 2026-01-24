//
//  StatsCardView.swift
//  MomentumJournal
//

import SwiftUI

struct StatsCardView: View {
    let icon: String
    let title: String
    let value: String
    let subtitle: String?
    let color: Color
    var onTap: (() -> Void)?

    init(
        icon: String,
        title: String,
        value: String,
        subtitle: String? = nil,
        color: Color,
        onTap: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.color = color
        self.onTap = onTap
    }

    var body: some View {
        Button {
            onTap?()
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                // Icon
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.15))
                    .cornerRadius(8)

                // Value
                Text(value)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)

                // Title
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                // Subtitle
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        HStack(spacing: 16) {
            StatsCardView(
                icon: "chart.bar.fill",
                title: "Total Goals",
                value: "12",
                subtitle: "3 this week",
                color: .blue
            )

            StatsCardView(
                icon: "target",
                title: "Active Goals",
                value: "8",
                color: .green
            )
        }

        HStack(spacing: 16) {
            StatsCardView(
                icon: "book.fill",
                title: "Total Journals",
                value: "45",
                subtitle: "5 this week",
                color: .purple
            )

            StatsCardView(
                icon: "flame.fill",
                title: "Current Streak",
                value: "7",
                subtitle: "days",
                color: .orange
            )
        }
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}
