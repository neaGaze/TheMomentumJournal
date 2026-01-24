//
//  InsightSummaryCard.swift
//  MomentumJournal
//

import SwiftUI

struct InsightSummaryCard: View {
    let summary: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "lightbulb.fill")
                    .font(.title2)
                    .foregroundColor(.yellow)

                Text("Summary")
                    .font(.headline)
            }

            Text(summary)
                .font(.body)
                .foregroundColor(.primary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

#Preview {
    InsightSummaryCard(summary: "This week you've shown great consistency in journaling, with entries focusing on productivity and personal growth. Your mood has been predominantly positive.")
        .padding()
        .background(Color(.systemGroupedBackground))
}
