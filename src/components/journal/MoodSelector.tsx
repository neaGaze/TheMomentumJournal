'use client'

import type { Mood } from '@/types'
import { MOODS, MOOD_LABELS } from '@/types'

interface MoodSelectorProps {
  value: Mood | null
  onChange: (mood: Mood | null) => void
  disabled?: boolean
}

const moodColors: Record<Mood, string> = {
  great: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
  good: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200',
  bad: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
  terrible: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
}

const moodSelectedColors: Record<Mood, string> = {
  great: 'bg-green-500 text-white border-green-500',
  good: 'bg-blue-500 text-white border-blue-500',
  neutral: 'bg-gray-500 text-white border-gray-500',
  bad: 'bg-orange-500 text-white border-orange-500',
  terrible: 'bg-red-500 text-white border-red-500',
}

const moodIcons: Record<Mood, string> = {
  great: '5',
  good: '4',
  neutral: '3',
  bad: '2',
  terrible: '1',
}

export function MoodSelector({ value, onChange, disabled }: MoodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((mood) => (
        <button
          key={mood}
          type="button"
          onClick={() => onChange(value === mood ? null : mood)}
          disabled={disabled}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition
            ${
              value === mood
                ? moodSelectedColors[mood]
                : moodColors[mood]
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span className="text-xs font-bold">{moodIcons[mood]}</span>
          <span>{MOOD_LABELS[mood]}</span>
        </button>
      ))}
    </div>
  )
}

// Badge variant for display purposes
interface MoodBadgeProps {
  mood: Mood
  size?: 'sm' | 'md'
}

export function MoodBadge({ mood, size = 'sm' }: MoodBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded font-medium
        ${sizeClasses}
        ${moodColors[mood].split(' hover:')[0]}
      `}
    >
      <span className="font-bold">{moodIcons[mood]}</span>
      <span>{MOOD_LABELS[mood]}</span>
    </span>
  )
}
