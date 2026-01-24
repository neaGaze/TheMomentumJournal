//
//  AuthService.swift
//  MomentumJournal
//

import Foundation
import Supabase

@MainActor
final class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var supabase: SupabaseClient {
        SupabaseClientManager.shared.client
    }

    init() {}

    // MARK: - Sign In

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let session = try await supabase.auth.signIn(email: email, password: password)
            currentUser = session.user
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Sign Up

    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let response = try await supabase.auth.signUp(email: email, password: password)
            currentUser = response.user
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Sign Out

    func signOut() async {
        isLoading = true
        errorMessage = nil

        do {
            try await supabase.auth.signOut()
            currentUser = nil
            isAuthenticated = false
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Restore Session

    func restoreSession() async {
        isLoading = true

        do {
            let session = try await supabase.auth.session
            currentUser = session.user
            isAuthenticated = true
        } catch {
            // No valid session, user needs to login
            currentUser = nil
            isAuthenticated = false
        }

        isLoading = false
    }
}
