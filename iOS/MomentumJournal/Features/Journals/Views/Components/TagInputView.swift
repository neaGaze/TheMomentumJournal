//
//  TagInputView.swift
//  MomentumJournal
//

import SwiftUI

struct TagInputView: View {
    @Binding var tags: [String]
    @State private var inputText = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Tag chips
            if !tags.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(tags, id: \.self) { tag in
                        TagChip(tag: tag) {
                            tags.removeAll { $0 == tag }
                        }
                    }
                }
            }

            // Input field
            HStack {
                TextField("Add tags (comma-separated)", text: $inputText)
                    .textInputAutocapitalization(.never)
                    .onSubmit {
                        addTags()
                    }

                if !inputText.isEmpty {
                    Button {
                        addTags()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.blue)
                    }
                }
            }
        }
    }

    private func addTags() {
        let newTags = inputText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty && !tags.contains($0) }

        tags.append(contentsOf: newTags)
        inputText = ""
    }
}

struct TagChip: View {
    let tag: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(tag)
                .font(.subheadline)

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.blue.opacity(0.1))
        .foregroundColor(.blue)
        .cornerRadius(16)
    }
}


#Preview {
    struct PreviewWrapper: View {
        @State var tags = ["work", "personal", "goals"]

        var body: some View {
            Form {
                Section("Tags") {
                    TagInputView(tags: $tags)
                }
            }
        }
    }

    return PreviewWrapper()
}
