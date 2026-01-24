//
//  SupabaseClient.swift
//  MomentumJournal
//

import Foundation
import Supabase
import KeychainAccess

// Custom auth storage using Keychain
struct KeychainAuthStorage: AuthLocalStorage {
    private let keychain: Keychain

    init() {
        keychain = Keychain(service: "com.nigeshshakya.momentumjournal.auth")
    }

    func store(key: String, value: Data) throws {
        try keychain.set(value, key: key)
    }

    func retrieve(key: String) throws -> Data? {
        try keychain.getData(key)
    }

    func remove(key: String) throws {
        try keychain.remove(key)
    }
}

final class SupabaseClientManager {
    static let shared = SupabaseClientManager()

    let client: SupabaseClient

    private init() {
        guard let url = URL(string: Config.supabaseURL) else {
            fatalError("Invalid Supabase URL")
        }

        client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: Config.supabaseAnonKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    storage: KeychainAuthStorage()
                )
            )
        )
    }
}
