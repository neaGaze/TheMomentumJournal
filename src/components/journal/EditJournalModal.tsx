'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import type { JournalEntry, Mood, Goal } from '@/types'
import { useToast } from '@/hooks/useToast'
import { MoodSelector } from './MoodSelector'
import { GoalTagging } from './GoalTagging'
import ReactMarkdown from 'react-markdown'

const editJournalSchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).nullable().optional(),
})

type EditJournalFormData = z.infer<typeof editJournalSchema>

interface EditJournalModalProps {
  entry: JournalEntry | null
  linkedGoals?: Goal[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditJournalModal({
  entry,
  linkedGoals = [],
  isOpen,
  onClose,
  onSuccess,
}: EditJournalModalProps) {
  const { showToast } = useToast()
  const [showPreview, setShowPreview] = useState(false)
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditJournalFormData>({
    resolver: zodResolver(editJournalSchema),
  })

  const contentValue = watch('content')

  useEffect(() => {
    if (entry && isOpen) {
      reset({
        title: entry.title || '',
        content: entry.content,
        entryDate: format(entry.entryDate, 'yyyy-MM-dd'),
        mood: entry.mood as Mood | null,
      })
      setSelectedGoalIds(linkedGoals.map((g) => g.id))
      setShowPreview(false)
    }
  }, [entry, linkedGoals, isOpen, reset])

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

  const onSubmit = async (data: EditJournalFormData) => {
    if (!entry) return

    try {
      const response = await fetch(`/api/journals/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title || null,
          content: data.content,
          entryDate: data.entryDate,
          mood: data.mood,
          goalIds: selectedGoalIds,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update entry')
      }

      showToast('Journal entry updated successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Update journal error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to update entry', 'error')
    }
  }

  if (!isOpen || !entry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Edit Journal Entry</h2>
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
          {/* Title */}
          <div>
            <label
              htmlFor="edit-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              {...register('title')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional title for your entry"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Entry Date */}
          <div>
            <label
              htmlFor="edit-entryDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input
              id="edit-entryDate"
              type="date"
              {...register('entryDate')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How are you feeling?
            </label>
            <Controller
              name="mood"
              control={control}
              render={({ field }) => (
                <MoodSelector
                  value={field.value as Mood | null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Content with preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-content"
                className="block text-sm font-medium text-gray-700"
              >
                Content <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>

            {showPreview ? (
              <div className="min-h-[200px] px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                {contentValue ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{contentValue}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">Nothing to preview</p>
                )}
              </div>
            ) : (
              <textarea
                id="edit-content"
                rows={8}
                {...register('content')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                placeholder="Write your journal entry... (Markdown supported)"
              />
            )}
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Supports Markdown: **bold**, *italic*, # headings, - lists, etc.
            </p>
          </div>

          {/* Goal Tagging */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Goals
            </label>
            <GoalTagging
              selectedGoalIds={selectedGoalIds}
              onChange={setSelectedGoalIds}
            />
          </div>

          {/* Actions */}
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
