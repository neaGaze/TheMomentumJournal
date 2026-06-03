import { handlers } from '@/auth'

// Credentials provider needs Node runtime (bcrypt + pg).
export const runtime = 'nodejs'

export const { GET, POST } = handlers
