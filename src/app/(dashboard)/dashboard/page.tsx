import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
          <p className="text-gray-600 mb-2">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-gray-600">
            <strong>User ID:</strong> {user.id}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold mb-2">Goals</h3>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-gray-600">Active goals</p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="font-semibold mb-2">Journal Entries</h3>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-gray-600">This week</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <h3 className="font-semibold mb-2">AI Insights</h3>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-gray-600">Generated</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-gray-500 text-center">
            Phase 1 (Auth) complete! Ready for Goals & Journal features.
          </p>
        </div>
      </div>
    </div>
  )
}
