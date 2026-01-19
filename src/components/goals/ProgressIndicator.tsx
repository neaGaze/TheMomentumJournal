'use client'

interface ProgressIndicatorProps {
  value: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

function getProgressColor(value: number): string {
  if (value < 30) return 'bg-red-500'
  if (value < 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getProgressBgColor(value: number): string {
  if (value < 30) return 'bg-red-100'
  if (value < 70) return 'bg-yellow-100'
  return 'bg-green-100'
}

function getTextColor(value: number): string {
  if (value < 30) return 'text-red-700'
  if (value < 70) return 'text-yellow-700'
  return 'text-green-700'
}

const sizeStyles = {
  sm: { bar: 'h-1.5', text: 'text-xs' },
  md: { bar: 'h-2', text: 'text-sm' },
  lg: { bar: 'h-3', text: 'text-base' },
}

export function ProgressIndicator({
  value,
  size = 'md',
  showLabel = true,
  className = '',
}: ProgressIndicatorProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const { bar, text } = sizeStyles[size]
  const bgColor = getProgressBgColor(clampedValue)
  const fillColor = getProgressColor(clampedValue)
  const textColor = getTextColor(clampedValue)

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className={`${text} font-medium ${textColor}`}>
            {clampedValue}%
          </span>
        </div>
      )}
      <div className={`w-full ${bgColor} rounded-full overflow-hidden ${bar}`}>
        <div
          className={`${fillColor} ${bar} rounded-full transition-all duration-300`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
