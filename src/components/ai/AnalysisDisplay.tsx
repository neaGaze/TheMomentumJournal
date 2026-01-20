'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import type { AIAnalysis, AnalysisType } from '@/types'

interface AnalysisDisplayProps {
  analysis: AIAnalysis
  onClose?: () => void
  showHeader?: boolean
}

const analysisTypeLabels: Record<AnalysisType, string> = {
  'on-demand': 'On-Demand Analysis',
  weekly: 'Weekly Analysis',
  monthly: 'Monthly Analysis',
}

const analysisTypeColors: Record<AnalysisType, string> = {
  'on-demand': 'bg-blue-100 text-blue-700',
  weekly: 'bg-green-100 text-green-700',
  monthly: 'bg-purple-100 text-purple-700',
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  icon?: React.ReactNode
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  icon,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
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
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

export function AnalysisDisplay({
  analysis,
  onClose,
  showHeader = true,
}: AnalysisDisplayProps) {
  const [copied, setCopied] = useState(false)

  const formatContent = () => {
    const parts: string[] = []

    // Insights
    if (analysis.insights) {
      parts.push('## Insights\n')
      if (analysis.insights.patterns?.length) {
        parts.push('### Patterns\n')
        analysis.insights.patterns.forEach((p) => parts.push(`- ${p}\n`))
      }
      if (analysis.insights.key_themes?.length) {
        parts.push('\n### Key Themes\n')
        analysis.insights.key_themes.forEach((t) => parts.push(`- ${t}\n`))
      }
      if (analysis.insights.sentiment) {
        parts.push(`\n### Sentiment\n${analysis.insights.sentiment}\n`)
      }
    }

    // Recommendations
    if (analysis.recommendations) {
      parts.push('\n## Recommendations\n')
      if (analysis.recommendations.suggestions?.length) {
        parts.push('### Suggestions\n')
        analysis.recommendations.suggestions.forEach((s) => parts.push(`- ${s}\n`))
      }
      if (analysis.recommendations.action_items?.length) {
        parts.push('\n### Action Items\n')
        analysis.recommendations.action_items.forEach((a) => parts.push(`- ${a}\n`))
      }
      if (analysis.recommendations.focus_areas?.length) {
        parts.push('\n### Focus Areas\n')
        analysis.recommendations.focus_areas.forEach((f) => parts.push(`- ${f}\n`))
      }
    }

    // Progress Summary
    if (analysis.progressSummary) {
      parts.push('\n## Progress Summary\n')
      if (analysis.progressSummary.overall_progress !== undefined) {
        parts.push(`**Overall Progress:** ${analysis.progressSummary.overall_progress}%\n`)
      }
      if (analysis.progressSummary.momentum_score !== undefined) {
        parts.push(`**Momentum Score:** ${analysis.progressSummary.momentum_score}/100\n`)
      }
      if (analysis.progressSummary.goals_on_track?.length) {
        parts.push('\n### Goals On Track\n')
        analysis.progressSummary.goals_on_track.forEach((g) => parts.push(`- ${g}\n`))
      }
      if (analysis.progressSummary.goals_behind?.length) {
        parts.push('\n### Goals Needing Attention\n')
        analysis.progressSummary.goals_behind.forEach((g) => parts.push(`- ${g}\n`))
      }
    }

    return parts.join('')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatContent())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
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
            <div>
              <h3 className="font-semibold text-gray-900">AI Analysis</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    analysisTypeColors[analysis.analysisType]
                  }`}
                >
                  {analysisTypeLabels[analysis.analysisType]}
                </span>
                <span className="text-xs text-gray-500">
                  {format(analysis.createdAt, 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <svg
                    className="w-4 h-4 text-green-600"
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
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
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
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Insights Section */}
        {analysis.insights && (
          <CollapsibleSection
            title="Insights"
            icon={
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            }
          >
            <div className="space-y-4">
              {analysis.insights.patterns?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Patterns</h4>
                  <ul className="space-y-1.5">
                    {analysis.insights.patterns.map((pattern, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-1">*</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.insights.key_themes?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.insights.key_themes.map((theme, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {analysis.insights.sentiment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sentiment</h4>
                  <p className="text-sm text-gray-600">{analysis.insights.sentiment}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Recommendations Section */}
        {analysis.recommendations && (
          <CollapsibleSection
            title="Recommendations"
            icon={
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
          >
            <div className="space-y-4">
              {analysis.recommendations.suggestions?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h4>
                  <ul className="space-y-1.5">
                    {analysis.recommendations.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-1">*</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.recommendations.action_items?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Action Items</h4>
                  <ul className="space-y-1.5">
                    {analysis.recommendations.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-orange-500 mt-1">*</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.recommendations.focus_areas?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.recommendations.focus_areas.map((area, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CollapsibleSection>
        )}

        {/* Progress Summary Section */}
        {analysis.progressSummary && (
          <CollapsibleSection
            title="Progress Summary"
            icon={
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          >
            <div className="space-y-4">
              {/* Progress metrics */}
              <div className="grid grid-cols-2 gap-4">
                {analysis.progressSummary.overall_progress !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium mb-1">
                      Overall Progress
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {analysis.progressSummary.overall_progress}%
                    </p>
                  </div>
                )}
                {analysis.progressSummary.momentum_score !== undefined && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium mb-1">
                      Momentum Score
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {analysis.progressSummary.momentum_score}/100
                    </p>
                  </div>
                )}
              </div>

              {/* Goals status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.progressSummary.goals_on_track?.length ? (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Goals On Track
                    </h4>
                    <ul className="space-y-1">
                      {analysis.progressSummary.goals_on_track.map((goal, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 bg-green-50 px-2 py-1 rounded"
                        >
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {analysis.progressSummary.goals_behind?.length ? (
                  <div>
                    <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
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
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      Needs Attention
                    </h4>
                    <ul className="space-y-1">
                      {analysis.progressSummary.goals_behind.map((goal, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 bg-orange-50 px-2 py-1 rounded"
                        >
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <span>
              Analyzed {analysis.journalEntriesAnalyzed.length} journal{' '}
              {analysis.journalEntriesAnalyzed.length === 1 ? 'entry' : 'entries'}
            </span>
            <span>
              Analyzed {analysis.goalsAnalyzed.length} goal
              {analysis.goalsAnalyzed.length === 1 ? '' : 's'}
            </span>
            {analysis.tokensUsed && <span>{analysis.tokensUsed} tokens used</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact display for use in lists/cards
export function AnalysisDisplayCompact({
  analysis,
  onClick,
}: {
  analysis: AIAnalysis
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-blue-600"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                analysisTypeColors[analysis.analysisType]
              }`}
            >
              {analysisTypeLabels[analysis.analysisType]}
            </span>
            <span className="text-xs text-gray-500">
              {format(analysis.createdAt, 'MMM d, yyyy')}
            </span>
          </div>
          {analysis.insights.patterns?.length ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {analysis.insights.patterns[0]}
            </p>
          ) : analysis.insights.sentiment ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {analysis.insights.sentiment}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">View analysis details</p>
          )}
        </div>
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  )
}
