//
//  MoodSelectorView.swift
//  MomentumJournal
//

import SwiftUI

struct MoodSelectorView: View {
    @Binding var selectedMood: Mood?

    var body: some View {
        HStack(spacing: 12) {
            ForEach(Mood.allCases, id: \.self) { mood in
                MoodButton(
                    mood: mood,
                    isSelected: selectedMood == mood
                ) {
                    if selectedMood == mood {
                        selectedMood = nil
                    } else {
                        selectedMood = mood
                    }
                }
            }
        }
    }
}

struct MoodButton: View {
    let mood: Mood
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(mood.emoji)
                    .font(.title2)

                Text(mood.displayName)
                    .font(.caption2)
                    .foregroundColor(isSelected ? .primary : .secondary)
            }
            .frame(minWidth: 50)
            .padding(.vertical, 8)
            .padding(.horizontal, 4)
            .background(isSelected ? moodColor.opacity(0.2) : Color.clear)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? moodColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private var moodColor: Color {
        switch mood {
        case .great: return .green
        case .good: return .blue
        case .neutral: return .gray
        case .bad: return .orange
        case .terrible: return .red
        }
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State var mood: Mood? = .good

        var body: some View {
            VStack {
                MoodSelectorView(selectedMood: $mood)

                Text("Selected: \(mood?.displayName ?? "None")")
                    .padding()
            }
        }
    }

    return PreviewWrapper()
}
