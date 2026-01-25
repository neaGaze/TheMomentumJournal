'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Refresh session if it expires within 7 days
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000
// Max consecutive refresh failures before triggering re-login
const MAX_REFRESH_FAILURES = 3

const isDev = process.env.NODE_ENV === 'development'

function devLog(message: string, ...args: unknown[]) {
  if (isDev) {
    console.log(`[useAuth] ${message}`, ...args)
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshFailureCount = useRef(0)
  const router = useRouter()
  const supabase = createClient()

  // Refresh session if close to expiry
  const refreshSessionIfNeeded = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.expires_at) return

    // Validate expires_at is a valid number
    const expiresAtRaw = currentSession.expires_at
    if (typeof expiresAtRaw !== 'number' || !Number.isFinite(expiresAtRaw) || expiresAtRaw <= 0) {
      console.error('[useAuth] Invalid expires_at value:', expiresAtRaw)
      return
    }

    const expiresAt = expiresAtRaw * 1000 // convert to ms
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now

    devLog('Session check', {
      expiresAt: new Date(expiresAt).toISOString(),
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' minutes',
      needsRefresh: timeUntilExpiry < REFRESH_THRESHOLD_MS && timeUntilExpiry > 0
    })

    // Refresh if session expires within threshold
    if (timeUntilExpiry < REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
      devLog('Attempting session refresh...')
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        refreshFailureCount.current += 1
        console.error('[useAuth] Session refresh failed:', error.message, {
          failureCount: refreshFailureCount.current,
          code: error.status
        })

        // Trigger re-login if refresh consistently fails
        if (refreshFailureCount.current >= MAX_REFRESH_FAILURES) {
          console.error('[useAuth] Max refresh failures reached, redirecting to login')
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
          router.push('/login?error=session_expired')
          return
        }
      } else if (data.session) {
        refreshFailureCount.current = 0 // Reset on success
        setSession(data.session)
        setUser(data.session.user)
        devLog('Session refreshed successfully')
      }
    }
  }, [supabase.auth, router])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      devLog('Initial session check', { hasSession: !!session })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // Check if session needs refresh
      if (session) {
        refreshSessionIfNeeded(session)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      devLog('Auth state change', { event, hasSession: !!session })
      setSession(session)
      setUser(session?.user ?? null)

      // Refresh page on sign in/out to sync server state
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase.auth, refreshSessionIfNeeded])

  // Periodic session check (every hour)
  useEffect(() => {
    if (!session) return

    const checkInterval = setInterval(() => {
      refreshSessionIfNeeded(session)
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(checkInterval)
  }, [session, refreshSessionIfNeeded])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.push('/login')
    router.refresh()
  }

  return {
    user,
    session,
    loading,
    signOut,
  }
}
