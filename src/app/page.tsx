import Image from 'next/image'

// Force dynamic rendering - middleware handles auth redirects
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-24">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.svg"
            alt="The Momentum Journal Logo"
            width={120}
            height={120}
            className="w-24 h-24 md:w-32 md:h-32"
            priority
          />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          The Momentum Journal
        </h1>
        <p className="text-base md:text-lg text-gray-600 mb-8">
          Track your goals and stay accountable with AI-powered insights
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition font-medium"
          >
            Login
          </a>
          <a
            href="/signup"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Sign Up
          </a>
        </div>
      </div>
    </main>
  )
}
