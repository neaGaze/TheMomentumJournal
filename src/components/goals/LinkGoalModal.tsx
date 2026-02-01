'use client'

import { useEffect, useState } from 'react'
import type { Goal } from '@/types'
import { useToast } from '@/hooks/useToast'

const ERROR_MESSAGES: Record<string, string> = {
  GOAL_ALREADY_LINKED: 'This goal is already linked to a parent goal',
  PARENT_NOT_LONG_TERM: 'Parent goal must be a long-term goal',
  GOAL_HAS_CHILDREN: 'Cannot link - this goal has linked short-term goals',
  TYPE_CHANGE_BLOCKED_HAS_PARENT: 'Cannot change to long-term while linked to a parent goal',
}

const getErrorMessage = (error: { code?: string; message?: string } | string): string => {
  if (typeof error === 'string') return error
  if (error.code && ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code]
  return error.message || 'An unexpected error occurred'
}

interface LinkGoalModalProps {
  goal: Goal | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function LinkGoalModal({
  goal,
  isOpen,
  onClose,
  onSuccess,
}: LinkGoalModalProps) {
  const { showToast } = useToast()
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string>('')

  // Fetch long-term goals when modal opens
  useEffect(() => {
    if (isOpen && goal) {
      setLoading(true)
      setSelectedParentId(goal.parentGoalId || '')
      fetch('/api/goals/long-term')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            // Exclude current goal from list
            setLongTermGoals(result.data.filter((g: Goal) => g.id !== goal.id))
          }
        })
        .catch((err) => console.error('Failed to fetch long-term goals:', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen, goal])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal || !selectedParentId) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentGoalId: selectedParentId }),
      })
      const result = await res.json()

      if (!result.success) {
        showToast(getErrorMessage(result.error), 'error')
        return
      }

      showToast('Goal linked successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Link goal error:', error)
      showToast('Failed to link goal', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !goal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Link to Long-Term Goal</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Link <span className="font-medium text-gray-900">{goal.title}</span> to a long-term goal:
            </p>

            {loading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-gray-500">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Loading goals...
              </div>
            ) : longTermGoals.length === 0 ? (
              <div className="py-4 text-center text-gray-500 text-sm">
                No long-term goals available. Create a long-term goal first.
              </div>
            ) : (
              <select
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Select a long-term goal</option>
                {longTermGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedParentId || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Link Goal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
