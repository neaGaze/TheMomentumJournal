'use client'

import { useMemo } from 'react'
import type { Timeline, GoalActivityHeatMapResult } from '@/lib/db/dashboard'

export type { GoalActivityHeatMapResult }

interface ActivityHeatmapProps {
  data: GoalActivityHeatMapResult | null
  timeline: Timeline
  loading?: boolean
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_NAMES_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

interface WeekData {
  weekLabel: string
  dates: string[] // Array of 7 dates (Mon-Sun) for this week
}

/**
 * Get ISO week start (Monday) for a date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Adjust so Monday = 0
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Generate weeks data based on timeline
 */
function generateWeeksData(timeline: Timeline): WeekData[] {
  const now = new Date()
  const weeks: WeekData[] = []

  switch (timeline) {
    case 'week': {
      // Current week only
      const weekStart = getWeekStart(now)
      const dates: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        dates.push(formatDate(d))
      }
      weeks.push({
        weekLabel: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        dates,
      })
      break
    }

    case 'month': {
      // Match backend: ~30 days ago to today
      // Generate weeks from 4 weeks ago to current week (chronologically)
      const currentWeekStart = getWeekStart(now)

      // Build weeks array from oldest to newest (4 weeks back to current)
      for (let weeksBack = 4; weeksBack >= 0; weeksBack--) {
        const weekStart = new Date(currentWeekStart)
        weekStart.setDate(weekStart.getDate() - weeksBack * 7)

        const dates: string[] = []
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const d = new Date(weekStart)
          d.setDate(d.getDate() + dayOffset)
          dates.push(formatDate(d))
        }

        weeks.push({
          weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dates,
        })
      }
      break
    }

    case 'year': {
      // Last 52 weeks (or show by month for cleaner view)
      // Group by months for better readability
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      const startWeek = getWeekStart(yearAgo)

      let current = new Date(startWeek)
      while (current <= now) {
        const dates: string[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(current)
          d.setDate(d.getDate() + i)
          dates.push(formatDate(d))
        }
        // Show month label on first week of each month
        const firstDayOfWeek = new Date(current)
        const lastMonth = weeks.length > 0 ? new Date(weeks[weeks.length - 1].dates[0]).getMonth() : -1
        const showMonthLabel = firstDayOfWeek.getMonth() !== lastMonth || weeks.length === 0

        weeks.push({
          weekLabel: showMonthLabel ? monthNames[firstDayOfWeek.getMonth()] : '',
          dates,
        })
        current.setDate(current.getDate() + 7)
      }
      break
    }
  }

  return weeks
}

export function ActivityHeatmap({ data, timeline, loading = false }: ActivityHeatmapProps) {
  const weeksData = useMemo(() => generateWeeksData(timeline), [timeline])

  // Create lookup set for quick checking
  const activitySets = useMemo(() => {
    if (!data) return {}
    const sets: Record<string, Set<string>> = {}
    for (const [goalId, dates] of Object.entries(data.activityByGoal)) {
      sets[goalId] = new Set(dates)
    }
    return sets
  }, [data])

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="h-32 sm:h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  if (!data || data.goals.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Goal Activity</h3>
        <div className="h-32 sm:h-48 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No goals to track</p>
            <p className="text-xs text-gray-400 mt-1">Create goals and mention them in journal entries to see activity</p>
          </div>
        </div>
      </div>
    )
  }

  const goals = data.goals
  const isYearView = timeline === 'year'
  const isWeekView = timeline === 'week'
  const isMonthView = timeline === 'month'
  const dayLabels = isYearView ? DAY_NAMES_SHORT : DAY_NAMES

  // Calculate stats
  const totalActiveDays = new Set(
    Object.values(data.activityByGoal).flat()
  ).size

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Goal Activity</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{goals.length} goals</span>
          <span className="text-gray-300">|</span>
          <span>{totalActiveDays} active days</span>
        </div>
      </div>

      {/* Scrollable container for month/year views */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        {/* Year view: 52 weeks * 14px cell + gaps + goal column = ~850px minimum */}
        {/* Week/Month view: constrained width for compact appearance */}
        <div className={`${isYearView ? 'min-w-[calc(96px+52*14px+52*2px)]' : isWeekView || isMonthView ? 'max-w-md' : ''}`}>
          {/* Header row with day names */}
          <div className="flex">
            {/* Goal name column spacer */}
            <div className={`${isYearView ? 'w-24' : 'w-28 sm:w-36'} flex-shrink-0`} />

            {/* Week columns with day headers */}
            <div className="flex flex-1 gap-[2px]">
              {weeksData.map((week, weekIdx) => (
                <div key={weekIdx} className="flex-1 min-w-0">
                  {/* Week label */}
                  {!isWeekView && (
                    <div className="text-[10px] text-gray-400 text-center mb-1 truncate h-4">
                      {week.weekLabel}
                    </div>
                  )}
                  {/* Day labels for this week */}
                  <div className="flex gap-[2px]">
                    {dayLabels.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`${isWeekView ? 'w-4 sm:w-5' : 'flex-1'} text-center text-[10px] sm:text-xs text-gray-400 ${isWeekView ? 'pb-1' : ''}`}
                      >
                        {isWeekView || weekIdx === 0 ? day : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal rows */}
          <div className="space-y-1">
            {goals.map((goal) => {
              const goalActivitySet = activitySets[goal.id] || new Set()

              return (
                <div key={goal.id} className="flex items-center group">
                  {/* Goal name */}
                  <div
                    className={`${isYearView ? 'w-24' : 'w-28 sm:w-36'} flex-shrink-0 pr-2 flex items-center gap-2`}
                  >
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: goal.color }}
                    />
                    <span className="text-xs sm:text-sm text-gray-700 truncate" title={goal.title}>
                      {goal.title}
                    </span>
                  </div>

                  {/* Activity cells */}
                  <div className="flex flex-1 gap-[2px]">
                    {weeksData.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-1 gap-[2px]">
                        {week.dates.map((date, dayIdx) => {
                          const isActive = goalActivitySet.has(date)
                          const dateObj = new Date(date)
                          const isToday = formatDate(new Date()) === date
                          const isFuture = dateObj > new Date()

                          return (
                            <div
                              key={date}
                              className={`${isWeekView ? 'w-4 h-4 sm:w-5 sm:h-5' : 'flex-1'} relative group/cell`}
                            >
                              <div
                                data-testid={`heatmap-cell-${goal.id}-${date}`}
                                className={`
                                  ${isWeekView ? 'w-full h-full' : 'aspect-square'} rounded-sm sm:rounded
                                  ${isFuture ? 'bg-gray-50' : isActive ? '' : 'bg-gray-100'}
                                  ${isToday ? 'ring-1 ring-gray-400' : ''}
                                  transition-transform hover:scale-110 cursor-default
                                `}
                                style={isActive && !isFuture ? { backgroundColor: goal.color } : undefined}
                              />
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-20 pointer-events-none">
                                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                  <p className="font-medium">{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                  <p style={{ color: goal.color }}>{goal.title}</p>
                                  <p>{isFuture ? 'Future date' : isActive ? 'Worked on' : 'No activity'}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-end gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-50" />
              <span>Future</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-100" />
              <span>No activity</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Show sample of actual goal colors */}
              <div className="flex -space-x-1">
                {goals.slice(0, 3).map((g) => (
                  <div
                    key={g.id}
                    className="w-3 h-3 rounded-sm border border-white"
                    style={{ backgroundColor: g.color }}
                  />
                ))}
              </div>
              <span>Goal worked on</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gray-100 ring-1 ring-gray-400" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
