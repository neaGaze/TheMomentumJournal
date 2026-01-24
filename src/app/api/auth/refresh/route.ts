import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/refresh
 * Explicitly refresh the current session
 * Returns updated session info or 401 if not authenticated
 */
export async function POST() {
  const supabase = await createClient()

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  // Force refresh the session
  const { data, error: refreshError } = await supabase.auth.refreshSession()

  if (refreshError) {
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    expiresAt: data.session?.expires_at,
  })
}

/**
 * GET /api/auth/refresh
 * Check current session status
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    )
  }

  return NextResponse.json({
    authenticated: true,
    expiresAt: session.expires_at,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  })
}
