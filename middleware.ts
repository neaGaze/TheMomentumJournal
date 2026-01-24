import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookieOptions } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, getSessionCookieOptions(options))
          )
        },
      },
    }
  )

  // Refresh session - extends cookie lifetime on each request
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - check all dashboard paths
  const protectedPaths = ['/dashboard', '/journal', '/goals', '/insights']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from auth pages
  const authPaths = ['/login', '/signup', '/forgot-password']
  if (user && authPaths.includes(request.nextUrl.pathname)) {
    // Check for redirect param to return user to original destination
    const redirect = request.nextUrl.searchParams.get('redirect')
    return NextResponse.redirect(new URL(redirect || '/dashboard', request.url))
  }

  // Also redirect from home page if authenticated
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
