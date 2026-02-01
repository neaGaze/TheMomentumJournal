'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Goal, GoalType } from '@/types'
import { GOAL_TYPES, GOAL_TYPE_LABELS } from '@/types'
import { useToast } from '@/hooks/useToast'

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  type: z.enum(['long-term', 'short-term'] as const),
  category: z.string().max(50, 'Category too long').optional(),
  targetDate: z.string().optional(),
  parentGoalId: z.string().optional(),
})

type CreateGoalFormData = z.infer<typeof createGoalSchema>

interface CreateGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateGoalModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateGoalModalProps) {
  const { showToast } = useToast()
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([])
  const [loadingLongTermGoals, setLoadingLongTermGoals] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalFormData>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      type: 'short-term',
      parentGoalId: '',
    },
  })

  const selectedType = watch('type')

  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  // Fetch long-term goals when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingLongTermGoals(true)
      fetch('/api/goals/long-term')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setLongTermGoals(result.data)
          }
        })
        .catch((err) => console.error('Failed to fetch long-term goals:', err))
        .finally(() => setLoadingLongTermGoals(false))
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const onSubmit = async (data: CreateGoalFormData) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          type: data.type,
          category: data.category || null,
          targetDate: data.targetDate || null,
          parentGoalId: data.type === 'short-term' && data.parentGoalId ? data.parentGoalId : null,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create goal')
      }

      showToast('Goal created successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Create goal error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to create goal', 'error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Goal</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition"
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
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              {...register('title')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
              placeholder="e.g., Learn Spanish"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder:text-gray-500"
              placeholder="Describe your goal..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                {...register('type')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              >
                {GOAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {GOAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <input
                id="category"
                type="text"
                {...register('category')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder:text-gray-500"
                placeholder="e.g., Health, Career"
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.category.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="targetDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Target Date
            </label>
            <input
              id="targetDate"
              type="date"
              {...register('targetDate')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            {errors.targetDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.targetDate.message}
              </p>
            )}
          </div>

          {/* Parent Goal - only for short-term goals */}
          {selectedType === 'short-term' && (
            <div>
              <label
                htmlFor="parentGoalId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Link to Long-Term Goal
              </label>
              <div className="relative">
                <select
                  id="parentGoalId"
                  {...register('parentGoalId')}
                  disabled={loadingLongTermGoals}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">No parent goal</option>
                  {longTermGoals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
                {loadingLongTermGoals && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {longTermGoals.length === 0 && !loadingLongTermGoals && (
                <p className="mt-1 text-sm text-gray-500">
                  No active long-term goals available
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
