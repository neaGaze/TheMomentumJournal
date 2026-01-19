'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { RecentActivityItem } from '@/lib/db/dashboard'
import type { GoalStatus, Mood } from '@/types'

interface RecentActivityFeedProps {
  activities: RecentActivityItem[]
  loading?: boolean
}

const statusColors: Record<GoalStatus, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-yellow-100 text-yellow-700',
  abandoned: 'bg-gray-100 text-gray-700',
}

const moodEmoji: Record<Mood, string> = {
  great: '5/5',
  good: '4/5',
  neutral: '3/5',
  bad: '2/5',
  terrible: '1/5',
}

function GoalIcon({ status }: { status?: GoalStatus }) {
  const color = status === 'completed' ? 'text-blue-500' : status === 'active' ? 'text-green-500' : 'text-gray-400'
  return (
    <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    </div>
  )
}

function JournalIcon() {
  return (
    <div className="p-2 rounded-lg bg-gray-50 text-green-500">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
  )
}

function ActivityItem({ activity }: { activity: RecentActivityItem }) {
  const href = activity.type === 'goal' ? '/goals' : '/journal'
  const timeAgo = formatDistanceToNow(activity.updatedAt, { addSuffix: true })

  return (
    <Link href={href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
      {activity.type === 'goal' ? <GoalIcon status={activity.status} /> : <JournalIcon />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition">
            {activity.title}
          </p>
          {activity.type === 'goal' && activity.status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[activity.status]}`}>
              {activity.status}
            </span>
          )}
          {activity.type === 'journal' && activity.mood && (
            <span className="text-xs text-gray-500">
              {moodEmoji[activity.mood]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span className="capitalize">{activity.type}</span>
          <span>-</span>
          <span>{timeAgo}</span>
          {activity.type === 'goal' && activity.progressPercentage !== undefined && (
            <>
              <span>-</span>
              <span>{activity.progressPercentage}% complete</span>
            </>
          )}
        </div>
      </div>

      <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  )
}

export function RecentActivityFeed({ activities, loading = false }: RecentActivityFeedProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <LoadingSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500">No recent activity</p>
          <p className="text-sm text-gray-400 mt-1">Your goals and journal entries will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <ActivityItem key={`${activity.type}-${activity.id}`} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}
