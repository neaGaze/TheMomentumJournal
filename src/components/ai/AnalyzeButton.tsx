'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/useToast'
import type { AIAnalysis } from '@/types'
import { AnalysisDisplay } from './AnalysisDisplay'
import { AnalysisLoadingState } from './AnalysisLoadingState'

interface AnalyzeButtonProps {
  type: 'goal' | 'journal'
  id: string
  label?: string
  variant?: 'default' | 'compact' | 'icon'
  onAnalysisComplete?: (analysis: AIAnalysis) => void
}

export function AnalyzeButton({
  type,
  id,
  label,
  variant = 'default',
  onAnalysisComplete,
}: AnalyzeButtonProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [showModal, setShowModal] = useState(false)

  const handleAnalyze = async () => {
    setLoading(true)
    setShowModal(true)

    try {
      const endpoint = type === 'goal' ? '/api/ai/analyze-goal' : '/api/ai/analyze-journal'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          type === 'goal' ? { goalId: id } : { journalId: id }
        ),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Analysis failed')
      }

      // Map dates from strings to Date objects
      const mappedAnalysis: AIAnalysis = {
        ...result.data,
        createdAt: new Date(result.data.createdAt),
      }

      setAnalysis(mappedAnalysis)
      onAnalysisComplete?.(mappedAnalysis)
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to analyze. Please try again.',
        'error'
      )
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    setAnalysis(null)
  }

  const buttonContent = () => {
    if (variant === 'icon') {
      return (
        <svg
          className="w-4 h-4"
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
      )
    }

    return (
      <>
        <svg
          className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
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
        {label || 'Analyze'}
      </>
    )
  }

  const buttonClasses = {
    default:
      'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed',
    compact:
      'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed',
    icon: 'p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition disabled:opacity-50 disabled:cursor-not-allowed',
  }

  return (
    <>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={buttonClasses[variant]}
        title={`Analyze ${type}`}
      >
        {buttonContent()}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={!loading ? handleClose : undefined}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
            {loading ? (
              <div className="p-6">
                <AnalysisLoadingState />
              </div>
            ) : analysis ? (
              <AnalysisDisplay analysis={analysis} onClose={handleClose} />
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}

// Standalone modal for viewing an existing analysis
export function AnalysisModal({
  analysis,
  isOpen,
  onClose,
}: {
  analysis: AIAnalysis | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !analysis) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <AnalysisDisplay analysis={analysis} onClose={onClose} />
      </div>
    </div>
  )
}
