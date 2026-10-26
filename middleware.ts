import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'

// Edge-safe auth instance: authConfig has NO db/bcrypt imports.
const { auth } = NextAuth(authConfig)

const protectedPaths = ['/dashboard', '/journal', '/goals', '/insights']
const authPaths = ['/login', '/signup']
const sessionCookies = ['authjs.session-token', '__Secure-authjs.session-token']

// Mobile clients send `Authorization: Bearer <session jwt>`; copy it into the
// session cookie so route handlers' auth() sees it.
function withBearerCookie(req: Request) {
  const authz = req.headers.get('authorization')
  if (!authz?.startsWith('Bearer ')) return null
  const cookie = req.headers.get('cookie') ?? ''
  if (sessionCookies.some((c) => cookie.includes(`${c}=`))) return null
  const token = authz.slice(7)
  const headers = new Headers(req.headers)
  const injected = sessionCookies.map((c) => `${c}=${token}`).join('; ')
  headers.set('cookie', cookie ? `${cookie}; ${injected}` : injected)
  return headers
}

export default auth((req) => {
  const { nextUrl } = req

  if (nextUrl.pathname.startsWith('/api/')) {
    const headers = withBearerCookie(req)
    return headers ? NextResponse.next({ request: { headers } }) : NextResponse.next()
  }

  const isLoggedIn = !!req.auth
  const path = nextUrl.pathname

  const isProtected = protectedPaths.some((p) => path.startsWith(p))
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  const isAuthPath = authPaths.some((p) => path === p || path === `${p}/`)
  if (isAuthPath && isLoggedIn) {
    const redirect = nextUrl.searchParams.get('redirect')
    return NextResponse.redirect(new URL(redirect || '/dashboard', nextUrl))
  }

  if (path === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
