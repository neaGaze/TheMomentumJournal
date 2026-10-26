//
//  KeychainService.swift
//  MomentumJournal
//

import Foundation
import KeychainAccess

final class KeychainService {
    static let shared = KeychainService()

    private let keychain: Keychain
    private let serviceName = "com.nigeshshakya.momentumjournal"

    private enum Keys {
        static let accessToken = "accessToken"
        static let refreshToken = "refreshToken"
        static let userId = "userId"
    }

    private init() {
        keychain = Keychain(service: serviceName)
    }

    // MARK: - Access Token

    func saveAccessToken(_ token: String) throws {
        try keychain.set(token, key: Keys.accessToken)
    }

    func getAccessToken() -> String? {
        try? keychain.get(Keys.accessToken)
    }

    func deleteAccessToken() throws {
        try keychain.remove(Keys.accessToken)
    }

    // MARK: - Refresh Token

    func saveRefreshToken(_ token: String) throws {
        try keychain.set(token, key: Keys.refreshToken)
    }

    func getRefreshToken() -> String? {
        try? keychain.get(Keys.refreshToken)
    }

    func deleteRefreshToken() throws {
        try keychain.remove(Keys.refreshToken)
    }

    // MARK: - User ID

    func saveUserId(_ id: UUID) throws {
        try keychain.set(id.uuidString, key: Keys.userId)
    }

    func getUserId() -> UUID? {
        (try? keychain.get(Keys.userId)).flatMap { $0 }.flatMap(UUID.init(uuidString:))
    }

    func deleteUserId() throws {
        try keychain.remove(Keys.userId)
    }

    // MARK: - Convenience

    func clearAll() throws {
        try deleteAccessToken()
        try deleteRefreshToken()
        try deleteUserId()
    }
}
