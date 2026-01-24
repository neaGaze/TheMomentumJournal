//
//  MomentumJournalApp.swift
//  MomentumJournal
//
//  Created for The Momentum Journal iOS App
//

import SwiftUI

@main
struct MomentumJournalApp: App {
    let persistenceController = PersistenceController.shared
    @StateObject private var authService = AuthService()
    @StateObject private var syncService = SyncService()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isLoading {
                    LoadingView("Loading...")
                } else if authService.isAuthenticated {
                    MainTabView()
                        .environment(\.managedObjectContext, persistenceController.container.viewContext)
                } else {
                    LoginView()
                }
            }
            .environmentObject(authService)
            .environmentObject(syncService)
            .task {
                await authService.restoreSession()
            }
            .onChange(of: scenePhase) { newPhase in
                if newPhase == .active && authService.isAuthenticated {
                    Task {
                        await syncService.sync()
                    }
                }
            }
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        ZStack(alignment: .top) {
            TabView {
                DashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }

                GoalsListView()
                    .tabItem {
                        Label("Goals", systemImage: "target")
                    }

                JournalsListView()
                    .tabItem {
                        Label("Journals", systemImage: "book.fill")
                    }

                InsightsView()
                    .tabItem {
                        Label("Insights", systemImage: "lightbulb.fill")
                    }
            }

            ExpiryWarningBanner()
        }
    }
}
