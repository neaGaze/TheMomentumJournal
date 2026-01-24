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

    // MARK: - Convenience

    func clearAll() throws {
        try deleteAccessToken()
        try deleteRefreshToken()
    }
}
