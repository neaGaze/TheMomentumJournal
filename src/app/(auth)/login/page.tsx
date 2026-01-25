import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'

function LoginFormFallback() {
  return (
    <div className="space-y-4 w-full max-w-md animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Login to The Momentum Journal</p>
        </div>
        <Suspense fallback={<LoginFormFallback />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  )
}
