//
//  PatternItemView.swift
//  MomentumJournal
//

import SwiftUI

struct PatternItemView: View {
    let pattern: Pattern

    var body: some View {
        HStack(spacing: 12) {
            // Frequency badge
            Text(pattern.frequency)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.15))
                .foregroundColor(.blue)
                .cornerRadius(6)

            // Description
            Text(pattern.description)
                .font(.subheadline)
                .foregroundColor(.primary)
                .lineLimit(2)

            Spacer()

            // Impact indicator
            Circle()
                .fill(impactColor)
                .frame(width: 12, height: 12)
        }
        .padding(.vertical, 8)
    }

    private var impactColor: Color {
        switch pattern.impact {
        case .high: return .red
        case .medium: return .yellow
        case .low: return .green
        }
    }
}

#Preview {
    VStack(spacing: 0) {
        PatternItemView(pattern: Pattern(description: "Morning journaling correlates with higher productivity", frequency: "5x/week", impact: .high))
        Divider()
        PatternItemView(pattern: Pattern(description: "Exercise mentioned in 3 entries", frequency: "3x/week", impact: .medium))
        Divider()
        PatternItemView(pattern: Pattern(description: "Reading before bed", frequency: "2x/week", impact: .low))
    }
    .padding()
    .background(Color(.systemBackground))
    .cornerRadius(12)
    .padding()
}
