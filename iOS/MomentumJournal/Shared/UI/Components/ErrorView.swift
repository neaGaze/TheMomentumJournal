//
//  ErrorView.swift
//  MomentumJournal
//

import SwiftUI

struct ErrorView: View {
    let errorMessage: String
    let retryAction: (() -> Void)?

    init(_ errorMessage: String, retryAction: (() -> Void)? = nil) {
        self.errorMessage = errorMessage
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundColor(.red)

            Text(errorMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let retryAction {
                Button("Retry", action: retryAction)
                    .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

#Preview {
    ErrorView("Something went wrong") {
        print("Retry tapped")
    }
}
