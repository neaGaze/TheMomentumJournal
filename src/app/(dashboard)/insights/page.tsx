'use client'

import { useEffect, useState, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import type { WeeklyInsight, AIAnalysis } from '@/types'
import { InsightsTimeline } from '@/components/ai/InsightsTimeline'
import { AnalysisDisplay, AnalysisDisplayCompact } from '@/components/ai/AnalysisDisplay'
import { AnalysisLoadingState, AnalysisLoadingSkeleton } from '@/components/ai/AnalysisLoadingState'
import { RecommendationsList } from '@/components/ai/RecommendationsList'
import { AnalysisModal } from '@/components/ai/AnalyzeButton'

type Timeline = 'week' | 'month'

interface InsightsApiResponse {
  success: boolean
  data: WeeklyInsight[]
  error: { message: string } | null
}

interface AnalysesApiResponse {
  success: boolean
  data: AIAnalysis[]
  error: { message: string } | null
}

export default function InsightsPage() {
  const { showToast } = useToast()
  const [insights, setInsights] = useState<WeeklyInsight[]>([])
  const [analyses, setAnalyses] = useState<AIAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [timeline, setTimeline] = useState<Timeline>('week')
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysis | null>(null)

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai/insights?timeline=${timeline}`)
      const result: InsightsApiResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch insights')
      }

      // Map dates
      const mappedInsights = result.data.map((insight) => ({
        ...insight,
        weekStartDate: new Date(insight.weekStartDate),
        weekEndDate: new Date(insight.weekEndDate),
        createdAt: new Date(insight.createdAt),
      }))

      setInsights(mappedInsights)
    } catch (error) {
      console.error('Fetch insights error:', error)
      // Don't show error toast for expected 404 when no insights exist
    }
  }, [timeline])

  const fetchAnalyses = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/analyses?limit=10')
      const result: AnalysesApiResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch analyses')
      }

      // Map dates
      const mappedAnalyses = result.data.map((analysis) => ({
        ...analysis,
        createdAt: new Date(analysis.createdAt),
      }))

      setAnalyses(mappedAnalyses)
    } catch (error) {
      console.error('Fetch analyses error:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchInsights(), fetchAnalyses()])
      setLoading(false)
    }
    loadData()
  }, [fetchInsights, fetchAnalyses])

  const handleGenerateInsights = async () => {
    setGenerating(true)

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: timeline === 'week' ? 'weekly' : 'monthly',
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate insights')
      }

      showToast('Insights generated successfully!', 'success')
      await Promise.all([fetchInsights(), fetchAnalyses()])
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to generate insights',
        'error'
      )
    } finally {
      setGenerating(false)
    }
  }

  const latestInsight = insights[0]
  const latestAnalysis = analyses[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Insights</h1>
          <p className="mt-1 text-gray-500">
            AI-powered analysis of your goals and journal entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeline selector */}
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTimeline('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                timeline === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setTimeline('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                timeline === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateInsights}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
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
                Generate Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generating state overlay */}
      {generating && (
        <div className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <AnalysisLoadingState
              message="Claude is analyzing your goals and journal entries..."
            />
          </div>
        </div>
      )}

      {/* Main content grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <AnalysisLoadingSkeleton />
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <AnalysisLoadingSkeleton />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Latest insight or empty state */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest Insight Card */}
            {latestInsight ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
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
                    Latest {timeline === 'week' ? 'Weekly' : 'Monthly'} Insight
                  </h2>
                </div>
                <div className="p-4">
                  <p className="text-gray-700 mb-4">{latestInsight.summary}</p>

                  {/* Key achievements */}
                  {latestInsight.keyAchievements &&
                    latestInsight.keyAchievements.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          Key Achievements
                        </h3>
                        <div className="space-y-2">
                          {latestInsight.keyAchievements.map((achievement, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-sm text-gray-600 bg-green-50 p-2 rounded-lg"
                            >
                              <svg
                                className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
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
                              <span>{achievement.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Areas for improvement */}
                  {latestInsight.areasForImprovement &&
                    latestInsight.areasForImprovement.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          Areas for Improvement
                        </h3>
                        <RecommendationsList
                          recommendations={{}}
                          areasForImprovement={latestInsight.areasForImprovement}
                          showCheckboxes
                        />
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  No insights yet
                </h2>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  Generate your first AI-powered insight by clicking the
                  &quot;Generate Insights&quot; button above. Make sure you have some
                  journal entries or goals first!
                </p>
                <button
                  onClick={handleGenerateInsights}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  Generate Your First Insight
                </button>
              </div>
            )}

            {/* Insights Timeline */}
            {insights.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Insights Timeline</h2>
                </div>
                <div className="p-4">
                  <InsightsTimeline insights={insights} loading={loading} />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Recent Analyses */}
          <div className="space-y-6">
            {/* Recent Analyses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Recent Analyses</h2>
              </div>
              <div className="p-4">
                {analyses.length > 0 ? (
                  <div className="space-y-3">
                    {analyses.slice(0, 5).map((analysis) => (
                      <AnalysisDisplayCompact
                        key={analysis.id}
                        analysis={analysis}
                        onClick={() => setSelectedAnalysis(analysis)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <svg
                      className="w-10 h-10 mx-auto mb-2 text-gray-300"
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
                    <p className="text-sm">No analyses yet</p>
                    <p className="text-xs mt-1">
                      Analyze goals or journal entries to see them here
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Latest Analysis Details */}
            {latestAnalysis && latestAnalysis.recommendations && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">
                    Latest Recommendations
                  </h2>
                </div>
                <div className="p-4">
                  <RecommendationsList
                    recommendations={latestAnalysis.recommendations}
                    showCheckboxes
                  />
                </div>
              </div>
            )}

            {/* Quick tips */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100 p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Tips for Better Insights
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Write journal entries regularly for better patterns
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Keep your goals updated with progress
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">*</span>
                  Link journal entries to related goals
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Analysis modal */}
      <AnalysisModal
        analysis={selectedAnalysis}
        isOpen={!!selectedAnalysis}
        onClose={() => setSelectedAnalysis(null)}
      />
    </div>
  )
}
