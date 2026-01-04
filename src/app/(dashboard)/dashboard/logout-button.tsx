'use client'

import { useAuth } from '@/hooks/use-auth'

export function LogoutButton() {
  const { signOut } = useAuth()

  return (
    <button
      onClick={signOut}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
    >
      Logout
    </button>
  )
}
