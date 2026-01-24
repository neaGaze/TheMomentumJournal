//
//  ExpiryWarningBanner.swift
//  MomentumJournal
//

import SwiftUI

struct ExpiryWarningBanner: View {
    private let expiryDate: Date
    private let warningThreshold: TimeInterval = 48 * 60 * 60 // 48 hours

    init() {
        // Build date + 7 days
        let buildDate = Self.getBuildDate()
        expiryDate = buildDate.addingTimeInterval(7 * 24 * 60 * 60)
    }

    var shouldShow: Bool {
        let timeRemaining = expiryDate.timeIntervalSinceNow
        return timeRemaining > 0 && timeRemaining <= warningThreshold
    }

    var daysRemaining: Int {
        let hours = expiryDate.timeIntervalSinceNow / 3600
        return max(0, Int(ceil(hours / 24)))
    }

    var body: some View {
        if shouldShow {
            HStack(spacing: 8) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.white)

                Text("App expires in \(daysRemaining) day\(daysRemaining == 1 ? "" : "s"). Rebuild via Xcode to continue.")
                    .font(.caption)
                    .foregroundColor(.white)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.warning)
        }
    }

    private static func getBuildDate() -> Date {
        // Try to get build date from Info.plist or use compile time
        if let infoPath = Bundle.main.path(forResource: "Info", ofType: "plist"),
           let infoAttr = try? FileManager.default.attributesOfItem(atPath: infoPath),
           let buildDate = infoAttr[.creationDate] as? Date {
            return buildDate
        }

        // Fallback: use executable modification date
        if let executablePath = Bundle.main.executablePath,
           let execAttr = try? FileManager.default.attributesOfItem(atPath: executablePath),
           let modDate = execAttr[.modificationDate] as? Date {
            return modDate
        }

        // Ultimate fallback: current date (banner won't show)
        return Date()
    }
}

#Preview {
    VStack {
        ExpiryWarningBanner()
        Spacer()
    }
}
