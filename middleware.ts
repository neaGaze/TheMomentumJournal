import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookieOptions } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Track cookies that need to be set on any response (including redirects)
  let cookiesToSync: { name: string; value: string; options?: Parameters<typeof getSessionCookieOptions>[0] }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Store for syncing to any response
          cookiesToSync = cookiesToSet

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, getSessionCookieOptions(options))
          )
        },
      },
    }
  )

  // Refresh session - extends cookie lifetime on each request
  // getUser() validates token with Supabase server (more secure than getSession)
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  // Debug: log auth check results in development
  if (process.env.NODE_ENV === 'development') {
    const path = request.nextUrl.pathname
    if (['/login', '/signup', '/forgot-password', '/'].includes(path)) {
      console.log(`[Middleware] Path: ${path}, User: ${user?.id ?? 'null'}, Error: ${userError?.message ?? 'none'}`)
    }
  }

  // Helper to copy refreshed cookies to redirect responses
  const createRedirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url)
    // Copy any refreshed session cookies to the redirect response
    cookiesToSync.forEach(({ name, value, options }) =>
      redirectResponse.cookies.set(name, value, getSessionCookieOptions(options))
    )
    return redirectResponse
  }

  // Protected routes - check all dashboard paths
  const protectedPaths = ['/dashboard', '/journal', '/goals', '/insights']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return createRedirectWithCookies(loginUrl)
  }

  // Redirect authenticated users from auth pages
  const authPaths = ['/login', '/signup', '/forgot-password']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname === `${path}/`
  )
  if (user && isAuthPath) {
    // Check for redirect param to return user to original destination
    const redirect = request.nextUrl.searchParams.get('redirect')
    return createRedirectWithCookies(new URL(redirect || '/dashboard', request.url))
  }

  // Also redirect from home page if authenticated
  if (user && request.nextUrl.pathname === '/') {
    return createRedirectWithCookies(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
