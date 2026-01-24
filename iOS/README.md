# MomentumJournal iOS

Native iOS app for momentum-based journaling with AI insights.

## Overview

MomentumJournal is a journaling app that links daily entries to personal goals, providing AI-powered insights to track patterns and maintain momentum.

## Features

- **Authentication**: Email/password signup and login via Supabase Auth
- **Goals Management**: Create, edit, delete goals with categories and deadlines
- **Journal Entries**: Rich text entries with mood tracking and tagging
- **Goal-Journal Linking**: Associate journal entries with specific goals
- **Dashboard**: Stats overview with recent activity
- **AI Insights**: Pattern analysis, recommendations, and goal progress
- **Offline Support**: Local Core Data storage with background sync
- **Session Persistence**: Keychain-based token storage

## Requirements

- iOS 15.0+
- Xcode 15.0+
- Swift 5.9+
- Supabase project (for backend)

## Dependencies

Managed via Swift Package Manager:

| Package | Version | Purpose |
|---------|---------|---------|
| supabase-swift | 2.0.0+ | Backend client, auth, realtime |
| KeychainAccess | 4.2.2+ | Secure token storage |

## Quick Start

### 1. Clone and Open

```bash
cd /Users/nigeshshakya/Documents/dev/TheMomentumJournal/iOS
open MomentumJournal.xcodeproj
```

### 2. Configure Backend

Edit `MomentumJournal/Config.swift`:

```swift
struct Config {
    static let supabaseURL = "YOUR_SUPABASE_URL"
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
}
```

### 3. Build and Run

- Select target device (simulator or physical device)
- Press Cmd+R or click Run

For device testing, see [TESTING_GUIDE.md](./TESTING_GUIDE.md).

## Architecture

### Pattern: MVVM + Repository

```
┌─────────────────────────────────────────────────────────────┐
│                        Views (SwiftUI)                       │
│  LoginView, GoalsListView, JournalEditorView, DashboardView │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ViewModels (@Observable)                  │
│   GoalsListViewModel, JournalsListViewModel, etc.           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Repositories                           │
│      GoalsRepository, JournalsRepository, etc.              │
│   ┌─────────────────┐         ┌──────────────────┐         │
│   │ LocalDataSource │◄───────►│ NetworkDataSource│         │
│   │   (Core Data)   │         │   (Supabase)     │         │
│   └─────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Core Services                           │
│   AuthService, KeychainService, SyncService, SupabaseClient │
└─────────────────────────────────────────────────────────────┘
```

### Key Patterns

- **Offline-First**: All data saved locally first, synced in background
- **Repository Pattern**: Abstracts data source from ViewModels
- **Protocol-Oriented**: Interfaces enable testing and flexibility
- **Async/Await**: Modern Swift concurrency throughout

## Project Structure

```
MomentumJournal/
├── MomentumJournalApp.swift     # App entry point
├── ContentView.swift            # Root navigation
├── Config.swift                 # Environment config
├── Persistence.swift            # Core Data stack
├── Core/
│   ├── Models/                  # Data models (Goal, JournalEntry, etc.)
│   ├── Networking/              # SupabaseClient
│   └── Services/                # Auth, Keychain, Sync services
├── Features/
│   ├── Auth/Views/              # Login, SignUp screens
│   ├── Goals/
│   │   ├── Repository/          # Local + Network data sources
│   │   ├── ViewModels/          # List + Form ViewModels
│   │   └── Views/               # List, Form, Detail views
│   ├── Journals/
│   │   ├── Repository/
│   │   ├── ViewModels/
│   │   └── Views/               # + Components (MoodSelector, TagInput)
│   ├── Dashboard/
│   │   ├── Repository/
│   │   ├── ViewModels/
│   │   └── Views/               # StatsCard, RecentActivity
│   └── Insights/
│       ├── Repository/
│       ├── ViewModels/
│       └── Views/               # Components (InsightSummary, etc.)
└── Shared/
    └── UI/
        ├── Components/          # LoadingView, ErrorView, EmptyState
        └── Styles/              # Colors, Typography
```

## Data Flow

### Authentication
1. User enters credentials in LoginView/SignUpView
2. AuthService calls Supabase Auth
3. On success, tokens stored in Keychain
4. App navigates to main content

### Creating Data
1. User fills form (GoalFormView/JournalEditorView)
2. ViewModel validates and calls Repository
3. Repository saves to Core Data (immediate)
4. Repository queues sync to Supabase (background)
5. SyncService handles retry on failure

### Loading Data
1. ViewModel requests data from Repository
2. Repository returns cached Core Data first
3. Repository fetches fresh from Supabase
4. On new data, Repository updates Core Data
5. ViewModel receives updates via @Published

## Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for:
- Device setup instructions
- Test scenarios
- Troubleshooting

## Build Configurations

| Config | Purpose |
|--------|---------|
| Debug | Development, verbose logging |
| Release | Production, optimized |

## Notes

- Free provisioning expires in 7 days; rebuild or use paid account
- Supabase free tier has rate limits; monitor usage
- Large text entries (40KB+) may impact performance
- Core Data migrations needed if schema changes

## Links

- [Testing Guide](./TESTING_GUIDE.md)
- [Verification Checklist](./VERIFICATION.md)
