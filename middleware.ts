import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'

// Edge-safe auth instance: authConfig has NO db/bcrypt imports.
const { auth } = NextAuth(authConfig)

const protectedPaths = ['/dashboard', '/journal', '/goals', '/insights']
const authPaths = ['/login', '/signup']

export default auth((req) => {
  const { nextUrl } = req
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
