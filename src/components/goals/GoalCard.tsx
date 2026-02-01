'use client'

import { useState, useEffect } from 'react'
import type { Goal, GoalStatus, GoalType } from '@/types'
import { GOAL_STATUS_LABELS, GOAL_TYPE_LABELS } from '@/types'
import { ProgressIndicator } from './ProgressIndicator'
import { AnalyzeButton } from '@/components/ai/AnalyzeButton'
import { useToast } from '@/hooks/useToast'
import { format } from 'date-fns'

const ERROR_MESSAGES: Record<string, string> = {
  GOAL_ALREADY_LINKED: 'This goal is already linked to a parent goal',
  PARENT_NOT_LONG_TERM: 'Parent goal must be a long-term goal',
  GOAL_HAS_CHILDREN: 'Cannot unlink - this goal has linked short-term goals',
  TYPE_CHANGE_BLOCKED_HAS_PARENT: 'Cannot change to long-term while linked to a parent goal',
}

const getErrorMessage = (error: { code?: string; message?: string } | string): string => {
  if (typeof error === 'string') return error
  if (error.code && ERROR_MESSAGES[error.code]) return ERROR_MESSAGES[error.code]
  return error.message || 'An unexpected error occurred'
}

interface GoalCardProps {
  goal: Goal
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  onLink?: (goal: Goal) => void
  onUnlink?: (goal: Goal) => void
  onRefresh?: () => void
  showAnalyze?: boolean
  parentGoal?: Goal | null
  childGoals?: Goal[]
}

const statusColors: Record<GoalStatus, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  abandoned: 'bg-gray-100 text-gray-700',
}

const typeColors: Record<GoalType, string> = {
  'long-term': 'bg-purple-100 text-purple-700',
  'short-term': 'bg-orange-100 text-orange-700',
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  onRefresh,
  showAnalyze = true,
  parentGoal: initialParentGoal,
  childGoals: initialChildGoals,
}: GoalCardProps) {
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [parentGoal, setParentGoal] = useState<Goal | null>(initialParentGoal ?? null)
  const [childGoals, setChildGoals] = useState<Goal[]>(initialChildGoals ?? [])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch linked goals when expanded - with AbortController for race condition
  useEffect(() => {
    if (!expanded || initialParentGoal || initialChildGoals) return

    const abortController = new AbortController()
    setLoadingLinks(true)

    fetch(`/api/goals/${goal.id}/link`, { signal: abortController.signal })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setParentGoal(result.data.parentGoal || null)
          setChildGoals(result.data.childGoals || [])
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch goal links:', err)
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoadingLinks(false)
        }
      })

    return () => abortController.abort()
  }, [expanded, goal.id, initialParentGoal, initialChildGoals, refreshKey])

  // Force refresh when goal data changes (e.g., after linking)
  useEffect(() => {
    if (goal.parentGoalId !== (parentGoal?.id ?? null)) {
      setRefreshKey((k) => k + 1)
    }
  }, [goal.parentGoalId, parentGoal?.id])

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setUnlinking(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/link`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setParentGoal(null)
        showToast('Goal unlinked', 'success')
        onUnlink?.(goal)
        onRefresh?.()
      } else {
        showToast(getErrorMessage(result.error), 'error')
      }
    } catch (err) {
      console.error('Unlink error:', err)
      showToast('Failed to unlink goal', 'error')
    } finally {
      setUnlinking(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-4 sm:p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[goal.status]}`}
              >
                {GOAL_STATUS_LABELS[goal.status]}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColors[goal.type]}`}
              >
                {GOAL_TYPE_LABELS[goal.type]}
              </span>
              {goal.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {goal.category}
                </span>
              )}
              {/* Linked indicator for short-term goals */}
              {goal.type === 'short-term' && goal.parentGoalId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Linked
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {goal.title}
            </h3>
            {goal.description && !expanded && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <ProgressIndicator value={goal.progressPercentage} size="sm" />
        </div>

        {goal.targetDate && (
          <div className="mt-3 flex items-center gap-1 text-sm text-gray-500">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Target: {formatDate(goal.targetDate)}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 pt-4">
          {goal.description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Description
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {goal.description}
              </p>
            </div>
          )}

          {/* Parent Goal Link (for short-term goals) */}
          {goal.type === 'short-term' && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Parent Goal
              </h4>
              {loadingLinks ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : parentGoal ? (
                <div className="flex items-center justify-between gap-2 p-2 bg-indigo-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm text-indigo-700 truncate">{parentGoal.title}</span>
                  </div>
                  <button
                    onClick={handleUnlink}
                    disabled={unlinking}
                    className="flex-shrink-0 p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded transition disabled:opacity-50"
                    title="Unlink"
                  >
                    {unlinking ? (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Not linked</span>
                  {onLink && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onLink(goal)
                      }}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Link to goal
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Child Goals (for long-term goals) */}
          {goal.type === 'long-term' && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Linked Short-term Goals
              </h4>
              {loadingLinks ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : childGoals.length > 0 ? (
                <div className="space-y-2">
                  {childGoals.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm text-orange-700 truncate flex-1">{child.title}</span>
                      <span className="text-xs text-orange-600 flex-shrink-0">{child.progressPercentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-500">No linked goals</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {formatDate(goal.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated</span>
              <p className="font-medium text-gray-900">
                {formatDate(goal.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {showAnalyze && (
              <div onClick={(e) => e.stopPropagation()}>
                <AnalyzeButton type="goal" id={goal.id} variant="default" />
              </div>
            )}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(goal)
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(goal)
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
