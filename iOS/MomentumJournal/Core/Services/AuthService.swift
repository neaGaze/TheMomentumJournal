//
//  AuthService.swift
//  MomentumJournal
//

import Foundation

struct AppUser: Codable, Equatable {
    let id: UUID
    let email: String
    let name: String?
}

@MainActor
final class AuthService: ObservableObject {
    @Published var currentUser: AppUser?
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api = APIClient.shared
    private let keychain = KeychainService.shared

    init() {}

    /// Current user ID from Keychain (set on sign in)
    nonisolated static var currentUserId: UUID? {
        KeychainService.shared.getUserId()
    }

    // MARK: - Sign In

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await login(email: email, password: password)
        } catch APIError.unauthorized {
            errorMessage = "Invalid email or password"
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
            struct RegisterBody: Encodable {
                let email: String
                let password: String
                let fullName: String
            }
            let fullName = email.split(separator: "@").first.map(String.init) ?? email
            let _: Data = try await api.sendRaw(
                "POST", "api/auth/register",
                body: RegisterBody(email: email, password: password, fullName: fullName),
                authorized: false
            )
            try await login(email: email, password: password)
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
            try keychain.clearAll()
        } catch {
            errorMessage = error.localizedDescription
        }
        currentUser = nil
        isAuthenticated = false

        isLoading = false
    }

    // MARK: - Restore Session

    func restoreSession() async {
        isLoading = true

        struct SessionResponse: Decodable {
            let user: AppUser?
        }

        if keychain.getAccessToken() != nil,
           let session: SessionResponse = try? await api.send("GET", "api/auth/session"),
           let user = session.user {
            currentUser = user
            isAuthenticated = true
        } else {
            // No valid session, user needs to login
            currentUser = nil
            isAuthenticated = false
        }

        isLoading = false
    }

    // MARK: - Private

    private func login(email: String, password: String) async throws {
        struct LoginBody: Encodable {
            let email: String
            let password: String
        }
        struct LoginResponse: Decodable {
            let token: String
            let user: AppUser
        }

        let response: LoginResponse = try await api.send(
            "POST", "api/auth/mobile/login",
            body: LoginBody(email: email, password: password),
            authorized: false
        )
        try keychain.saveAccessToken(response.token)
        try keychain.saveUserId(response.user.id)
        currentUser = response.user
        isAuthenticated = true
    }
}
