'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Goal, GoalType, GoalStatus, GoalSortOptions } from '@/types'
import {
  GOAL_TYPES,
  GOAL_TYPE_LABELS,
  GOAL_STATUSES,
  GOAL_STATUS_LABELS,
} from '@/types'
import { GoalCard } from '@/components/goals/GoalCard'
import { EmptyState } from '@/components/goals/EmptyState'
import { CreateGoalModal } from '@/components/goals/CreateGoalModal'
import { EditGoalModal } from '@/components/goals/EditGoalModal'
import { DeleteGoalDialog } from '@/components/goals/DeleteGoalDialog'
import { LinkGoalModal } from '@/components/goals/LinkGoalModal'

type SortField = GoalSortOptions['field']
type SortDirection = GoalSortOptions['direction']
type ViewMode = 'grid' | 'list' | 'hierarchy'

interface GoalsApiResponse {
  success: boolean
  data: Goal[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  error: { message: string } | null
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<GoalType | ''>('')
  const [statusFilter, setStatusFilter] = useState<GoalStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [parentFilter, setParentFilter] = useState<string>('') // '' = all, 'none' = unlinked, uuid = specific parent
  const [categories, setCategories] = useState<string[]>([])
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([])

  // Sort
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null)
  const [linkingGoal, setLinkingGoal] = useState<Goal | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '12')
      params.set('sortField', sortField)
      params.set('sortDir', sortDir)

      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (parentFilter === 'none') {
        params.set('hasParent', 'false')
      } else if (parentFilter) {
        params.set('parentGoalId', parentFilter)
      }

      const response = await fetch(`/api/goals?${params.toString()}`)
      const result: GoalsApiResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch goals')
      }

      // Map dates from strings to Date objects
      const mappedGoals = result.data.map((goal) => ({
        ...goal,
        targetDate: goal.targetDate ? new Date(goal.targetDate) : null,
        createdAt: new Date(goal.createdAt),
        updatedAt: new Date(goal.updatedAt),
      }))

      setGoals(mappedGoals)
      setTotalPages(result.pagination.totalPages)
      setTotalCount(result.pagination.totalCount)

      // Extract unique categories
      const uniqueCategories = new Set<string>()
      mappedGoals.forEach((g) => {
        if (g.category) uniqueCategories.add(g.category)
      })
      setCategories(Array.from(uniqueCategories).sort())
    } catch (err) {
      console.error('Fetch goals error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch goals')
    } finally {
      setLoading(false)
    }
  }, [page, sortField, sortDir, search, typeFilter, statusFilter, categoryFilter, parentFilter])

  // Fetch long-term goals for filter dropdown
  useEffect(() => {
    fetch('/api/goals/long-term')
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setLongTermGoals(result.data)
        }
      })
      .catch((err) => console.error('Failed to fetch long-term goals:', err))
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, statusFilter, categoryFilter, parentFilter, sortField, sortDir])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setCategoryFilter('')
    setParentFilter('')
    setSortField('created_at')
    setSortDir('desc')
  }

  const hasFilters =
    search || typeFilter || statusFilter || categoryFilter || parentFilter

  const handleCreateSuccess = () => {
    fetchGoals()
  }

  const handleEditSuccess = () => {
    fetchGoals()
  }

  const handleDeleteSuccess = () => {
    fetchGoals()
  }

  const handleLinkSuccess = () => {
    fetchGoals()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goals</h1>
          <p className="mt-1 text-gray-500">
            {totalCount} {totalCount === 1 ? 'goal' : 'goals'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Goal
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search goals..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as GoalType | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="">All Types</option>
              {GOAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {GOAL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as GoalStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="">All Statuses</option>
              {GOAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {GOAL_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Parent Goal Filter */}
            <select
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="">All Linkage</option>
              <option value="none">Unlinked Only</option>
              {longTermGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  Under: {g.title}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={`${sortField}-${sortDir}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('-') as [
                  SortField,
                  SortDirection
                ]
                setSortField(field)
                setSortDir(dir)
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 text-sm"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="progress_percentage-desc">Progress High-Low</option>
              <option value="progress_percentage-asc">Progress Low-High</option>
              <option value="target_date-asc">Target Date (Soon)</option>
              <option value="target_date-desc">Target Date (Later)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="Grid view"
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="List view"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('hierarchy')}
                className={`p-2 ${
                  viewMode === 'hierarchy'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                aria-label="Hierarchy view"
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </button>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          variant={hasFilters ? 'no-filtered-results' : 'no-goals'}
          onCreateGoal={() => setShowCreateModal(true)}
        />
      ) : viewMode === 'hierarchy' ? (
        <>
          {/* Hierarchy View - respects all applied filters */}
          <div className="space-y-6">
            {/* Long-term goals with their children (only if long-term goals exist in filtered results) */}
            {goals.filter((g) => g.type === 'long-term').length > 0 && (
              <>
                {goals
                  .filter((g) => g.type === 'long-term')
                  .map((longTermGoal) => {
                    // Children are short-term goals linked to this parent that also pass filters
                    const children = goals.filter(
                      (g) => g.parentGoalId === longTermGoal.id && g.type === 'short-term'
                    )
                    return (
                      <div key={longTermGoal.id} className="space-y-3">
                        <GoalCard
                          goal={longTermGoal}
                          onEdit={(g) => setEditingGoal(g)}
                          onDelete={(g) => setDeletingGoal(g)}
                          onRefresh={fetchGoals}
                        />
                        {children.length > 0 && (
                          <div className="ml-4 sm:ml-8 pl-4 border-l-2 border-indigo-200 space-y-3">
                            {children.map((child) => (
                              <GoalCard
                                key={child.id}
                                goal={child}
                                onEdit={(g) => setEditingGoal(g)}
                                onDelete={(g) => setDeletingGoal(g)}
                                onLink={(g) => setLinkingGoal(g)}
                                onRefresh={fetchGoals}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </>
            )}

            {/* Linked short-term goals whose parent is not in filtered results */}
            {(() => {
              const longTermIds = new Set(goals.filter(g => g.type === 'long-term').map(g => g.id))
              const orphanedLinked = goals.filter(
                (g) => g.type === 'short-term' && g.parentGoalId && !longTermIds.has(g.parentGoalId)
              )
              if (orphanedLinked.length === 0) return null
              return (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide px-1">
                    Linked Short-term Goals (parent filtered out)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {orphanedLinked.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={(g) => setEditingGoal(g)}
                        onDelete={(g) => setDeletingGoal(g)}
                        onLink={(g) => setLinkingGoal(g)}
                        onRefresh={fetchGoals}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Unlinked short-term goals */}
            {goals.filter(
              (g) => g.type === 'short-term' && !g.parentGoalId
            ).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide px-1">
                  Unlinked Short-term Goals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {goals
                    .filter((g) => g.type === 'short-term' && !g.parentGoalId)
                    .map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={(g) => setEditingGoal(g)}
                        onDelete={(g) => setDeletingGoal(g)}
                        onLink={(g) => setLinkingGoal(g)}
                        onRefresh={fetchGoals}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Goals Grid/List */}
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'flex flex-col gap-4'
            }
          >
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => setEditingGoal(g)}
                onDelete={(g) => setDeletingGoal(g)}
                onLink={goal.type === 'short-term' ? (g) => setLinkingGoal(g) : undefined}
                onRefresh={fetchGoals}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateGoalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditGoalModal
        goal={editingGoal}
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onSuccess={handleEditSuccess}
      />

      <DeleteGoalDialog
        goal={deletingGoal}
        isOpen={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onSuccess={handleDeleteSuccess}
      />

      <LinkGoalModal
        goal={linkingGoal}
        isOpen={!!linkingGoal}
        onClose={() => setLinkingGoal(null)}
        onSuccess={handleLinkSuccess}
      />
    </div>
  )
}
