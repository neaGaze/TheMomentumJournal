'use client'

import { useState } from 'react'
import type { Goal, GoalStatus, GoalType } from '@/types'
import { GOAL_STATUS_LABELS, GOAL_TYPE_LABELS } from '@/types'
import { ProgressIndicator } from './ProgressIndicator'
import { AnalyzeButton } from '@/components/ai/AnalyzeButton'
import { format } from 'date-fns'

interface GoalCardProps {
  goal: Goal
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  showAnalyze?: boolean
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

export function GoalCard({ goal, onEdit, onDelete, showAnalyze = true }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)

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

          <div className="flex gap-2 pt-2 border-t border-gray-100">
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
