'use client'

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import type { WeeklyInsight, AIAnalysis } from '@/types'
import { RecommendationsCompact } from './RecommendationsList'

type TimelineView = 'week' | 'month'

interface InsightsTimelineProps {
  insights: WeeklyInsight[]
  analyses?: AIAnalysis[]
  onInsightClick?: (insight: WeeklyInsight) => void
  onAnalysisClick?: (analysis: AIAnalysis) => void
  loading?: boolean
}

interface InsightCardProps {
  insight: WeeklyInsight
  onClick?: () => void
}

function InsightCard({ insight, onClick }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatDateRange = () => {
    const start = format(insight.weekStartDate, 'MMM d')
    const end = format(insight.weekEndDate, 'MMM d, yyyy')
    return `${start} - ${end}`
  }

  const hasAchievements = insight.keyAchievements && insight.keyAchievements.length > 0
  const hasImprovements =
    insight.areasForImprovement && insight.areasForImprovement.length > 0
  const hasProgressUpdates =
    insight.goalProgressUpdates && insight.goalProgressUpdates.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={() => (onClick ? onClick() : setExpanded(!expanded))}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Date range badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <svg
                  className="w-3.5 h-3.5 mr-1"
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
                {formatDateRange()}
              </span>
            </div>

            {/* Summary */}
            <p
              className={`text-sm text-gray-700 ${
                expanded ? '' : 'line-clamp-2'
              }`}
            >
              {insight.summary}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              {hasAchievements && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {insight.keyAchievements!.length} achievement
                  {insight.keyAchievements!.length !== 1 ? 's' : ''}
                </span>
              )}
              {hasProgressUpdates && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  {insight.goalProgressUpdates!.length} goal update
                  {insight.goalProgressUpdates!.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
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
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Key Achievements */}
          {hasAchievements && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                Key Achievements
              </h4>
              <ul className="space-y-2">
                {insight.keyAchievements!.map((achievement, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg"
                  >
                    <span className="text-green-500 mt-0.5">*</span>
                    <div>
                      <span className="font-medium">{achievement.title}</span>
                      {achievement.description && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Goal Progress Updates */}
          {hasProgressUpdates && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Goal Progress
              </h4>
              <div className="space-y-2">
                {insight.goalProgressUpdates!.map((update, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 font-medium">
                      {update.goal_title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {update.previous_progress}%
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      <span
                        className={`text-xs font-medium ${
                          update.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {update.current_progress}%
                        <span className="ml-1">
                          ({update.change >= 0 ? '+' : ''}
                          {update.change}%)
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas for Improvement */}
          {hasImprovements && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                <svg
                  className="w-4 h-4 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                Areas for Improvement
              </h4>
              <ul className="space-y-2">
                {insight.areasForImprovement!.map((area, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600 bg-orange-50 p-2 rounded-lg"
                  >
                    <span className="text-orange-500 mt-0.5">*</span>
                    <div>
                      <span className="font-medium">{area.area}</span>
                      <p className="text-gray-500 text-xs mt-0.5">{area.suggestion}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InsightCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full mb-1" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="flex gap-4 mt-3">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
        </div>
        <div className="w-5 h-5 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

export function InsightsTimeline({
  insights,
  analyses = [],
  onInsightClick,
  onAnalysisClick,
  loading = false,
}: InsightsTimelineProps) {
  const [view, setView] = useState<TimelineView>('week')
  const [dateFilter, setDateFilter] = useState<string>('')

  // Filter insights by date range
  const filteredInsights = insights.filter((insight) => {
    if (!dateFilter) return true
    const filterDate = new Date(dateFilter)
    return (
      insight.weekStartDate <= filterDate && insight.weekEndDate >= filterDate
    )
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <InsightCardSkeleton />
        <InsightCardSkeleton />
        <InsightCardSkeleton />
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
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
        <h3 className="text-lg font-medium text-gray-900 mb-1">No insights yet</h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          Generate your first insight by clicking &quot;Generate Insights&quot; above, or keep
          journaling and we&apos;ll analyze your progress weekly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              view === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
        </div>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          placeholder="Filter by date"
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 hidden sm:block" />

        <div className="space-y-4">
          {filteredInsights.map((insight) => (
            <div key={insight.id} className="relative sm:pl-10">
              {/* Timeline dot */}
              <div className="absolute left-2.5 top-6 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow hidden sm:block" />
              <InsightCard
                insight={insight}
                onClick={onInsightClick ? () => onInsightClick(insight) : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Date filter no results */}
      {dateFilter && filteredInsights.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No insights found for the selected date.</p>
          <button
            onClick={() => setDateFilter('')}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  )
}
