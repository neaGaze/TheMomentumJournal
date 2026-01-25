import type { CookieOptions } from '@supabase/ssr'

// 90 days in seconds
export const SESSION_EXPIRY_SECONDS = 90 * 24 * 60 * 60

// 90 days in milliseconds (for Date calculations)
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_SECONDS * 1000

/**
 * Get secure cookie options for session storage
 * - httpOnly: false - Supabase browser client needs to read cookies
 * - secure: only sent over HTTPS in production
 * - sameSite: lax allows top-level navigation, prevents CSRF
 * - maxAge: 90 days persistence
 *
 * Note: httpOnly is intentionally false because @supabase/ssr browser client
 * needs to read the session cookie for auth state management. The middleware
 * and server components still validate sessions server-side for security.
 */
export function getSessionCookieOptions(options?: CookieOptions): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    ...options,
    maxAge: SESSION_EXPIRY_SECONDS,
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  }
}

/**
 * Cookie name prefix used by Supabase
 */
export const SUPABASE_COOKIE_PREFIX = 'sb-'
