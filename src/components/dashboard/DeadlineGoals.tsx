'use client'

import Link from 'next/link'
import { format, isPast, isToday } from 'date-fns'
import type { Goal } from '@/types'
import { GOAL_STATUS_LABELS } from '@/types'
import type { GoalStatus } from '@/types'
import type { Timeline } from '@/lib/db/dashboard'
import { ProgressIndicator } from '@/components/goals/ProgressIndicator'

interface DeadlineGoalsProps {
  goals: Goal[]
  timeline: Timeline
  loading?: boolean
  startDate?: string
  endDate?: string
}

const statusColors: Record<GoalStatus, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  abandoned: 'bg-gray-100 text-gray-700',
}

function getDeadlineLabel(targetDate: Date): { text: string; className: string } {
  if (isToday(targetDate)) {
    return { text: 'Due today', className: 'text-orange-600 font-medium' }
  }
  if (isPast(targetDate)) {
    return { text: 'Overdue', className: 'text-red-600 font-medium' }
  }
  return {
    text: `Due ${format(targetDate, 'MMM d')}`,
    className: 'text-gray-500',
  }
}

function GoalItem({ goal }: { goal: Goal }) {
  const deadline = goal.targetDate ? getDeadlineLabel(goal.targetDate) : null

  return (
    <Link
      href="/goals"
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
    >
      {/* Icon */}
      <div className="p-2 rounded-lg bg-orange-50 text-orange-500 flex-shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition">
            {goal.title}
          </p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[goal.status]}`}
          >
            {GOAL_STATUS_LABELS[goal.status]}
          </span>
        </div>

        <div className="mt-1.5">
          <ProgressIndicator value={goal.progressPercentage} size="sm" />
        </div>

        {deadline && (
          <div className="flex items-center gap-1 mt-1.5">
            <svg
              className={`w-3.5 h-3.5 ${deadline.className}`}
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
            <span className={`text-xs ${deadline.className}`}>{deadline.text}</span>
          </div>
        )}
      </div>

      <svg
        className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition flex-shrink-0 mt-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse">
      <div className="w-9 h-9 bg-gray-200 rounded-lg" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-1.5 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

const timelineLabels: Record<Timeline, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
}

export function DeadlineGoals({
  goals,
  timeline,
  loading = false,
  startDate,
  endDate,
}: DeadlineGoalsProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(3)].map((_, i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const dateRangeText =
    startDate && endDate
      ? `${format(new Date(startDate + 'T00:00:00'), 'MMM d')} - ${format(new Date(endDate + 'T00:00:00'), 'MMM d')}`
      : ''

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Goals Due {timelineLabels[timeline]}
          </h3>
          {goals.length > 0 && (
            <span className="text-sm text-gray-500">
              {goals.length} goal{goals.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {dateRangeText && (
          <p className="text-xs text-gray-400 mt-1">{dateRangeText}</p>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="p-8 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-gray-500">No goals due {timelineLabels[timeline].toLowerCase()}</p>
          <p className="text-sm text-gray-400 mt-1">
            Set target dates on your short-term goals to see them here
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
