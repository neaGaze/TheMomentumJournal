'use client'

import { useEffect, useState } from 'react'
import type { JournalEntry } from '@/types'
import { useToast } from '@/hooks/useToast'

interface DeleteJournalDialogProps {
  entry: JournalEntry | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteJournalDialog({
  entry,
  isOpen,
  onClose,
  onSuccess,
}: DeleteJournalDialogProps) {
  const { showToast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!entry) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/journals/${entry.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete entry')
      }

      showToast('Journal entry deleted successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Delete journal error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to delete entry', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen || !entry) return null

  const displayTitle = entry.title || 'Untitled Entry'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Delete Journal Entry
          </h3>

          <p className="text-gray-500 text-center mb-2">
            Are you sure you want to delete this journal entry?
          </p>

          <p className="text-center font-medium text-gray-900 mb-4 px-4 py-2 bg-gray-50 rounded-lg truncate">
            "{displayTitle}"
          </p>

          <p className="text-sm text-gray-500 text-center mb-6">
            This action cannot be undone. The entry and all its goal links will be permanently removed.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
