import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { encode } from 'next-auth/jwt'
import { db } from '@/db'
import { users } from '@/db/schema'

export const runtime = 'nodejs'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Matches authConfig session.maxAge.
const MAX_AGE = 90 * 24 * 60 * 60

// Mobile login: returns a session JWT for `Authorization: Bearer`.
// middleware.ts copies the bearer into the session cookie so auth() works unchanged.
// Salt must equal the cookie name Auth.js reads (secure prefix on https).
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { email, password } = parsed.data

  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0] ?? new URL(req.url).protocol.replace(':', '')
  const salt = proto === 'https' ? '__Secure-authjs.session-token' : 'authjs.session-token'

  const token = await encode({
    token: { sub: user.id, id: user.id, email: user.email, name: user.fullName },
    secret: process.env.AUTH_SECRET!,
    salt,
    maxAge: MAX_AGE,
  })

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, name: user.fullName },
  })
}
