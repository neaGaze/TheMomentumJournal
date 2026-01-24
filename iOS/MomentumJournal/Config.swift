//
//  Config.swift
//  MomentumJournal
//
//  Created for The Momentum Journal iOS App
//

import Foundation

/// Configuration for Supabase connection
///
/// IMPORTANT: Fill in these values from your Next.js .env.local file:
/// - NEXT_PUBLIC_SUPABASE_URL -> supabaseURL
/// - NEXT_PUBLIC_SUPABASE_ANON_KEY -> supabaseAnonKey
/// - NEXT_PUBLIC_APP_URL -> apiURL
enum Config {
    static let supabaseURL = "https://wqulqoolxcrfngnqzuha.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdWxxb29seGNyZm5nbnF6dWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTE4MzYsImV4cCI6MjA4MzA2NzgzNn0.9zj9J5epMNBe_UQDxASzDlSvSv23TkoF_ZcR4815OuI"

    // Next.js API URL - production Vercel deployment
    static let apiURL = "https://the-momentum-journal.vercel.app"
}
