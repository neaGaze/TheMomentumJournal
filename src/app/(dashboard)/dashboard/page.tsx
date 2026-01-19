'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'
import type { Timeline, DashboardStats, ProgressDataPoint } from '@/lib/db/dashboard'
import {
  StatsCard,
  ActiveGoalsIcon,
  JournalEntriesIcon,
  StreakIcon,
  CompletedGoalsIcon,
  TotalGoalsIcon,
} from '@/components/dashboard/StatsCard'
import { GoalsProgressChart } from '@/components/dashboard/GoalsProgressChart'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { TimelineSelector } from '@/components/dashboard/TimelineSelector'

interface DashboardData {
  stats: DashboardStats | null
  progress: ProgressDataPoint[]
}

export default function DashboardPage() {
  const [timeline, setTimeline] = useState<Timeline>('week')
  const [data, setData] = useState<DashboardData>({ stats: null, progress: [] })
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const fetchDashboardData = useCallback(async (selectedTimeline: Timeline) => {
    setLoading(true)
    try {
      const [statsRes, progressRes] = await Promise.all([
        fetch(`/api/dashboard/stats?timeline=${selectedTimeline}&limit=10`),
        fetch(`/api/dashboard/progress?timeline=${selectedTimeline}`),
      ])

      if (!statsRes.ok || !progressRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const statsJson = await statsRes.json()
      const progressJson = await progressRes.json()

      if (!statsJson.success) {
        throw new Error(statsJson.error?.message || 'Failed to fetch stats')
      }

      if (!progressJson.success) {
        throw new Error(progressJson.error?.message || 'Failed to fetch progress')
      }

      setData({
        stats: statsJson.data,
        progress: progressJson.data?.points || [],
      })
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to load dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboardData(timeline)
  }, [timeline, fetchDashboardData])

  const handleTimelineChange = (newTimeline: Timeline) => {
    setTimeline(newTimeline)
  }

  const { stats, progress } = data
  const goalsStats = stats?.goals
  const journalStats = stats?.journals

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Welcome to The Momentum Journal</p>
        </div>
        <TimelineSelector
          value={timeline}
          onChange={handleTimelineChange}
          disabled={loading}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Active Goals"
          value={goalsStats?.byStatus.active ?? 0}
          icon={<ActiveGoalsIcon />}
          trend={
            goalsStats?.byStatus.active && goalsStats.byStatus.active > 0
              ? 'up'
              : 'neutral'
          }
          subtitle={`${goalsStats?.total ?? 0} total goals`}
          loading={loading}
        />
        <StatsCard
          title="Completed Goals"
          value={goalsStats?.byStatus.completed ?? 0}
          icon={<CompletedGoalsIcon />}
          trend={goalsStats?.completionRate && goalsStats.completionRate > 0 ? 'up' : 'neutral'}
          changePercent={goalsStats?.completionRate}
          subtitle="Completion rate"
          loading={loading}
        />
        <StatsCard
          title="Journal Entries"
          value={journalStats?.total ?? 0}
          icon={<JournalEntriesIcon />}
          trend={journalStats?.total && journalStats.total > 0 ? 'up' : 'neutral'}
          subtitle={`${journalStats?.avgEntriesPerWeek ?? 0}/week avg`}
          loading={loading}
        />
        <StatsCard
          title="Current Streak"
          value={`${journalStats?.currentStreak ?? 0} days`}
          icon={<StreakIcon />}
          trend={journalStats?.currentStreak && journalStats.currentStreak > 0 ? 'up' : 'neutral'}
          subtitle={`Best: ${journalStats?.longestStreak ?? 0} days`}
          loading={loading}
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="lg:col-span-2">
          <GoalsProgressChart
            data={progress}
            timeline={timeline}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityFeed
            activities={stats?.recentActivity ?? []}
            loading={loading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
