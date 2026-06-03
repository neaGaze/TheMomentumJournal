import type { NextAuthConfig } from 'next-auth'

// Edge-safe config: NO db/bcrypt imports. Imported by middleware.
// 90-day session to match prior Supabase SESSION_EXPIRY_SECONDS.
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 90 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
  pages: { signIn: '/login' },
  providers: [], // real Credentials provider added in src/auth.ts (Node runtime)
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
} satisfies NextAuthConfig
