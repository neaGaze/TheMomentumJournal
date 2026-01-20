'use client'

import { useMemo } from 'react'
import type { Timeline, ProgressDataPoint } from '@/lib/db/dashboard'

interface GoalsProgressChartProps {
  data: ProgressDataPoint[]
  timeline: Timeline
  loading?: boolean
}

export function GoalsProgressChart({ data, timeline, loading = false }: GoalsProgressChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    // Format dates for display
    return data.map((point) => {
      const date = new Date(point.date)
      let label: string

      switch (timeline) {
        case 'week':
          label = date.toLocaleDateString('en-US', { weekday: 'short' })
          break
        case 'month':
          label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          break
        case 'year':
          label = date.toLocaleDateString('en-US', { month: 'short' })
          break
        default:
          label = point.date
      }

      return {
        ...point,
        label,
      }
    })
  }, [data, timeline])

  const maxValue = useMemo(() => {
    if (!chartData.length) return 100
    const maxProgress = Math.max(...chartData.map((d) => d.avgProgress), 0)
    const maxGoals = Math.max(...chartData.map((d) => d.completedGoals + d.activeGoals), 0)
    return Math.max(maxProgress, maxGoals * 10, 100)
  }, [chartData])

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-48 sm:h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Progress</h3>
        <div className="h-48 sm:h-64 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>No data to display</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Goals Progress</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-gray-600">Progress %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-600">Completed</span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="h-48 sm:h-64 relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-400">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full flex flex-col">
          {/* Bars container */}
          <div className="flex-1 flex items-end gap-1 sm:gap-2 pb-2 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-gray-100" />
              <div className="border-b border-dashed border-gray-100" />
              <div className="border-b border-gray-200" />
            </div>

            {chartData.map((point, index) => {
              const progressHeight = Math.min(100, Math.max((point.avgProgress / 100) * 100, 0))
              const completedHeight = Math.min(100, Math.max(((point.completedGoals / Math.max(maxValue / 10, 1)) * 100), 0))

              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1 group relative z-10">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      <p className="font-medium">{point.label}</p>
                      <p>Progress: {point.avgProgress}%</p>
                      <p>Completed: {point.completedGoals}</p>
                      <p>Active: {point.activeGoals}</p>
                      <p>Journal: {point.journalEntries}</p>
                    </div>
                  </div>

                  {/* Bars */}
                  <div className="w-full flex gap-0.5 justify-center items-end h-full">
                    {/* Progress bar */}
                    <div
                      className="flex-1 max-w-3 sm:max-w-4 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${progressHeight}%`, minHeight: progressHeight > 0 ? '4px' : '0' }}
                    />
                    {/* Completed bar */}
                    <div
                      className="flex-1 max-w-3 sm:max-w-4 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                      style={{ height: `${completedHeight}%`, minHeight: completedHeight > 0 ? '4px' : '0' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex gap-1 sm:gap-2 h-6">
            {chartData.map((point, index) => (
              <div key={index} className="flex-1 text-center text-xs text-gray-500 truncate">
                {point.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
