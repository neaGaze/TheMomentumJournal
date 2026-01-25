import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'

function SignupFormFallback() {
  return (
    <div className="space-y-4 w-full max-w-md animate-pulse">
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-lg" />
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-gray-600">Create your Momentum Journal account</p>
        </div>
        <Suspense fallback={<SignupFormFallback />}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  )
}
