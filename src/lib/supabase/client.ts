import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser client for Supabase
 *
 * IMPORTANT: Uses default cookie handling from @supabase/ssr
 * - Does NOT manually set cookies (document.cookie cannot set httpOnly)
 * - Session cookies are set server-side (middleware.ts/server.ts) with httpOnly
 * - Browser client only reads cookies, never writes auth tokens
 * - This ensures XSS protection - JS cannot access httpOnly cookies
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
