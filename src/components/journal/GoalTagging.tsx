'use client'

import { useState, useEffect, useRef } from 'react'
import type { Goal } from '@/types'

interface GoalTaggingProps {
  selectedGoalIds: string[]
  onChange: (goalIds: string[]) => void
  disabled?: boolean
}

export function GoalTagging({ selectedGoalIds, onChange, disabled }: GoalTaggingProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals?pageSize=100&status=active')
        const result = await response.json()
        if (result.success) {
          setGoals(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch goals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGoals()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredGoals = goals.filter(
    (goal) =>
      goal.title.toLowerCase().includes(search.toLowerCase()) ||
      goal.description?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedGoals = goals.filter((g) => selectedGoalIds.includes(g.id))

  const toggleGoal = (goalId: string) => {
    if (selectedGoalIds.includes(goalId)) {
      onChange(selectedGoalIds.filter((id) => id !== goalId))
    } else {
      onChange([...selectedGoalIds, goalId])
    }
  }

  const removeGoal = (goalId: string) => {
    onChange(selectedGoalIds.filter((id) => id !== goalId))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected goals as chips */}
      {selectedGoals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedGoals.map((goal) => (
            <span
              key={goal.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
            >
              <span className="truncate max-w-[150px]">{goal.title}</span>
              <button
                type="button"
                onClick={() => removeGoal(goal.id)}
                disabled={disabled}
                className="p-0.5 hover:bg-blue-100 rounded transition"
              >
                <svg
                  className="w-3.5 h-3.5"
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
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-gray-500 text-sm">
          {loading ? 'Loading goals...' : 'Link to goals...'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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

      {/* Dropdown menu */}
      {isOpen && !loading && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search goals..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Goals list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredGoals.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {goals.length === 0 ? 'No active goals found' : 'No matching goals'}
              </div>
            ) : (
              filteredGoals.map((goal) => {
                const isSelected = selectedGoalIds.includes(goal.id)
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {goal.title}
                      </p>
                      {goal.category && (
                        <p className="text-xs text-gray-500">{goal.category}</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Display-only variant for showing linked goals
interface LinkedGoalsDisplayProps {
  goals: Goal[]
}

export function LinkedGoalsDisplay({ goals }: LinkedGoalsDisplayProps) {
  if (goals.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {goals.map((goal) => (
        <span
          key={goal.id}
          className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium"
        >
          {goal.title}
        </span>
      ))}
    </div>
  )
}
