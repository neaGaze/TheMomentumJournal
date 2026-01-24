//
//  ContentView.swift
//  MomentumJournal
//
//  Created for The Momentum Journal iOS App
//

import SwiftUI
import CoreData

struct ContentView: View {
    @Environment(\.managedObjectContext) private var viewContext

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)

                Text("The Momentum Journal")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Your journey starts here")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Welcome")
        }
    }
}

#Preview {
    ContentView()
        .environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
}
