'use client'

import { useState } from 'react'
import type { AIAnalysisRecommendations, AreaForImprovement } from '@/types'

interface RecommendationsListProps {
  recommendations: AIAnalysisRecommendations
  areasForImprovement?: AreaForImprovement[]
  onItemToggle?: (item: string, completed: boolean) => void
  showCheckboxes?: boolean
}

type Priority = 'high' | 'medium' | 'low'

const priorityColors: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

const priorityLabels: Record<Priority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
}

interface RecommendationItemProps {
  text: string
  priority?: Priority
  showCheckbox?: boolean
  onToggle?: (completed: boolean) => void
  type: 'suggestion' | 'action' | 'focus' | 'improvement'
}

function RecommendationItem({
  text,
  priority,
  showCheckbox = false,
  onToggle,
  type,
}: RecommendationItemProps) {
  const [completed, setCompleted] = useState(false)

  const handleToggle = () => {
    const newValue = !completed
    setCompleted(newValue)
    onToggle?.(newValue)
  }

  const typeIcons = {
    suggestion: (
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
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    action: (
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
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    focus: (
      <svg
        className="w-4 h-4 text-purple-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
    improvement: (
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
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
        completed
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {showCheckbox && (
        <button
          onClick={handleToggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
            completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-500'
          }`}
          aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {completed && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
      )}

      {!showCheckbox && <span className="mt-0.5 flex-shrink-0">{typeIcons[type]}</span>}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm text-gray-700 ${
            completed ? 'line-through text-gray-500' : ''
          }`}
        >
          {text}
        </p>
      </div>

      {priority && (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${priorityColors[priority]}`}
        >
          {priorityLabels[priority]}
        </span>
      )}
    </div>
  )
}

export function RecommendationsList({
  recommendations,
  areasForImprovement,
  onItemToggle,
  showCheckboxes = false,
}: RecommendationsListProps) {
  const hasSuggestions = recommendations.suggestions && recommendations.suggestions.length > 0
  const hasActionItems =
    recommendations.action_items && recommendations.action_items.length > 0
  const hasFocusAreas =
    recommendations.focus_areas && recommendations.focus_areas.length > 0
  const hasAreas = areasForImprovement && areasForImprovement.length > 0

  const isEmpty = !hasSuggestions && !hasActionItems && !hasFocusAreas && !hasAreas

  if (isEmpty) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">No recommendations available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Items - Most important */}
      {hasActionItems && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <svg
              className="w-5 h-5 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Action Items
          </h4>
          <div className="space-y-2">
            {recommendations.action_items!.map((item, i) => (
              <RecommendationItem
                key={i}
                text={item}
                type="action"
                showCheckbox={showCheckboxes}
                onToggle={(completed) => onItemToggle?.(item, completed)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Areas for Improvement */}
      {hasAreas && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <svg
              className="w-5 h-5 text-green-500"
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
            Areas for Improvement
          </h4>
          <div className="space-y-2">
            {areasForImprovement!.map((area, i) => (
              <RecommendationItem
                key={i}
                text={`${area.area}: ${area.suggestion}`}
                type="improvement"
                priority={area.priority}
                showCheckbox={showCheckboxes}
                onToggle={(completed) => onItemToggle?.(area.area, completed)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {hasSuggestions && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <svg
              className="w-5 h-5 text-blue-500"
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
            Suggestions
          </h4>
          <div className="space-y-2">
            {recommendations.suggestions!.map((suggestion, i) => (
              <RecommendationItem
                key={i}
                text={suggestion}
                type="suggestion"
                showCheckbox={showCheckboxes}
                onToggle={(completed) => onItemToggle?.(suggestion, completed)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Focus Areas */}
      {hasFocusAreas && (
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <svg
              className="w-5 h-5 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Focus Areas
          </h4>
          <div className="flex flex-wrap gap-2">
            {recommendations.focus_areas!.map((area, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebar/cards
export function RecommendationsCompact({
  recommendations,
  maxItems = 3,
}: {
  recommendations: AIAnalysisRecommendations
  maxItems?: number
}) {
  const allItems: { text: string; type: 'action' | 'suggestion' }[] = []

  // Prioritize action items
  recommendations.action_items?.forEach((item) => {
    allItems.push({ text: item, type: 'action' })
  })

  // Then suggestions
  recommendations.suggestions?.forEach((item) => {
    allItems.push({ text: item, type: 'suggestion' })
  })

  const displayItems = allItems.slice(0, maxItems)
  const remainingCount = allItems.length - maxItems

  if (displayItems.length === 0) return null

  return (
    <div className="space-y-2">
      {displayItems.map((item, i) => (
        <div key={i} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              item.type === 'action' ? 'bg-orange-500' : 'bg-blue-500'
            }`}
          />
          <span className="text-gray-600 line-clamp-1">{item.text}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <p className="text-xs text-gray-500 pl-3.5">+{remainingCount} more</p>
      )}
    </div>
  )
}
