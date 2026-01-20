'use client'

import { useState, useEffect } from 'react'

interface AnalysisLoadingStateProps {
  message?: string
  showProgress?: boolean
}

const loadingMessages = [
  'Claude is analyzing your data...',
  'Finding patterns in your progress...',
  'Generating personalized insights...',
  'Almost there...',
]

export function AnalysisLoadingState({
  message,
  showProgress = true,
}: AnalysisLoadingStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!message) {
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length)
      }, 3000)
      return () => clearInterval(messageInterval)
    }
  }, [message])

  useEffect(() => {
    if (showProgress) {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 500)
      return () => clearInterval(progressInterval)
    }
  }, [showProgress])

  const displayMessage = message || loadingMessages[currentMessageIndex]

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Animated brain/lightbulb icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-blue-400 rounded-full" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-purple-400 rounded-full" />
        </div>
      </div>

      {/* Message */}
      <p className="text-gray-700 font-medium text-center mb-4 transition-opacity duration-300">
        {displayMessage}
      </p>

      {/* Progress bar */}
      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Estimated time: 10-30 seconds
          </p>
        </div>
      )}

      {/* Skeleton preview */}
      <div className="w-full max-w-md mt-8 space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
      </div>
    </div>
  )
}

export function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>

      {/* Sections skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-100 rounded-lg">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  )
}
