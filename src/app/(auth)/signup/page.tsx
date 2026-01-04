import { AuthForm } from '@/components/auth/auth-form'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-gray-600">Create your Momentum Journal account</p>
        </div>
        <AuthForm mode="signup" />
      </div>
    </div>
  )
}
