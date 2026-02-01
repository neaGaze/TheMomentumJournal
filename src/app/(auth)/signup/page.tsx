import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AuthForm } from '@/components/auth/auth-form'

// Force dynamic rendering - middleware handles auth redirects
export const dynamic = 'force-dynamic'

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
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/logo.svg"
              alt="The Momentum Journal Logo"
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 mx-auto"
              priority
            />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Get Started</h1>
          <p className="text-gray-600 text-sm md:text-base">Create your Momentum Journal account</p>
        </div>
        <Suspense fallback={<SignupFormFallback />}>
          <AuthForm mode="signup" />
        </Suspense>
      </div>
    </div>
  )
}
