'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import type { JournalEntry, Goal, Mood } from '@/types'
import { MoodBadge } from './MoodSelector'
import { LinkedGoalsDisplay } from './GoalTagging'

interface JournalEntryCardProps {
  entry: JournalEntry
  linkedGoals?: Goal[]
  onEdit?: (entry: JournalEntry) => void
  onDelete?: (entry: JournalEntry) => void
}

export function JournalEntryCard({
  entry,
  linkedGoals = [],
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy')
  }

  const getExcerpt = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-4 sm:p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
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
                {formatDate(entry.entryDate)}
              </span>
              {entry.mood && <MoodBadge mood={entry.mood as Mood} />}
            </div>

            {/* Title */}
            {entry.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {entry.title}
              </h3>
            )}

            {/* Excerpt (only when collapsed) */}
            {!expanded && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {getExcerpt(entry.content)}
              </p>
            )}

            {/* Linked goals */}
            {linkedGoals.length > 0 && (
              <div className="mt-2">
                <LinkedGoalsDisplay goals={linkedGoals} />
              </div>
            )}
          </div>

          {/* Expand/collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
            aria-label={expanded ? 'Collapse' : 'Expand'}
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
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-100 pt-4">
          {/* Full markdown content */}
          <div className="prose prose-sm max-w-none text-gray-700 mb-4">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-500">Created</span>
              <p className="font-medium text-gray-900">
                {formatDate(entry.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated</span>
              <p className="font-medium text-gray-900">
                {formatDate(entry.updatedAt)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(entry)
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
                  onDelete(entry)
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
