import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SUPABASE_COOKIE_PREFIX } from '@/lib/supabase/config'

/**
 * POST /api/auth/signout
 * Sign out and clear all session cookies
 */
export async function POST() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Sign out via Supabase
  await supabase.auth.signOut()

  // Clear all Supabase-related cookies
  const allCookies = cookieStore.getAll()
  allCookies.forEach(cookie => {
    if (cookie.name.startsWith(SUPABASE_COOKIE_PREFIX)) {
      cookieStore.delete(cookie.name)
    }
  })

  return NextResponse.json({ success: true })
}
