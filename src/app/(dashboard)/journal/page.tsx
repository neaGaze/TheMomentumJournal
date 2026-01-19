'use client'

import { useEffect, useState, useCallback } from 'react'
import type { JournalEntry, Goal, Mood, JournalSortOptions, JournalEntryWithGoals } from '@/types'
import { MOODS, MOOD_LABELS } from '@/types'
import { JournalEntryCard } from '@/components/journal/JournalEntryCard'
import { EmptyState } from '@/components/journal/EmptyState'
import { CreateJournalModal } from '@/components/journal/CreateJournalModal'
import { EditJournalModal } from '@/components/journal/EditJournalModal'
import { DeleteJournalDialog } from '@/components/journal/DeleteJournalDialog'

type SortField = JournalSortOptions['field']
type SortDirection = JournalSortOptions['direction']

interface JournalsApiResponse {
  success: boolean
  data: JournalEntryWithGoals[]
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

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntryWithGoals[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState<Mood | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [goalFilter, setGoalFilter] = useState('')
  const [goals, setGoals] = useState<Goal[]>([])

  // Sort
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntryWithGoals | null>(null)
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null)

  // Fetch goals for filter dropdown
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals?pageSize=100')
        const result = await response.json()
        if (result.success) {
          setGoals(result.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch goals for filter:', err)
      }
    }
    fetchGoals()
  }, [])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '10')
      params.set('sortField', sortField)
      params.set('sortDir', sortDir)

      if (search) params.set('search', search)
      if (moodFilter) params.set('mood', moodFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (goalFilter) params.set('goalId', goalFilter)

      const response = await fetch(`/api/journals?${params.toString()}`)
      const result: JournalsApiResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch entries')
      }

      setEntries(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalCount(result.pagination.totalCount)
    } catch (err) {
      console.error('Fetch entries error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }, [page, sortField, sortDir, search, moodFilter, dateFrom, dateTo, goalFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, moodFilter, dateFrom, dateTo, goalFilter, sortField, sortDir])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const clearFilters = () => {
    setSearch('')
    setMoodFilter('')
    setDateFrom('')
    setDateTo('')
    setGoalFilter('')
    setSortField('entry_date')
    setSortDir('desc')
  }

  const hasFilters = search || moodFilter || dateFrom || dateTo || goalFilter

  const handleCreateSuccess = () => {
    fetchEntries()
  }

  const handleEditSuccess = () => {
    fetchEntries()
  }

  const handleDeleteSuccess = () => {
    fetchEntries()
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Journal</h1>
          <p className="mt-1 text-gray-500">
            {totalCount} {totalCount === 1 ? 'entry' : 'entries'}
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
          New Entry
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
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
                  placeholder="Search entries..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="entry_date-desc">Newest First</option>
              <option value="entry_date-asc">Oldest First</option>
              <option value="created_at-desc">Recently Created</option>
              <option value="updated_at-desc">Recently Updated</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2">
            {/* Mood Filter */}
            <select
              value={moodFilter}
              onChange={(e) => setMoodFilter(e.target.value as Mood | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">All Moods</option>
              {MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {MOOD_LABELS[mood]}
                </option>
              ))}
            </select>

            {/* Goal Filter */}
            {goals.length > 0 && (
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm max-w-[200px]"
              >
                <option value="">All Goals</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            )}

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                placeholder="From"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                placeholder="To"
              />
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
      ) : entries.length === 0 ? (
        <EmptyState
          variant={hasFilters ? 'no-filtered-results' : 'no-entries'}
          onCreateEntry={() => setShowCreateModal(true)}
        />
      ) : (
        <>
          {/* Entries List */}
          <div className="flex flex-col gap-4">
            {entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                linkedGoals={entry.mentionedGoals}
                onEdit={(e) => setEditingEntry({ ...e, mentionedGoals: entry.mentionedGoals })}
                onDelete={(e) => setDeletingEntry(e)}
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
      <CreateJournalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditJournalModal
        entry={editingEntry}
        linkedGoals={editingEntry?.mentionedGoals}
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={handleEditSuccess}
      />

      <DeleteJournalDialog
        entry={deletingEntry}
        isOpen={!!deletingEntry}
        onClose={() => setDeletingEntry(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
