import { cn } from '@/lib/cn'

interface ProgressBarProps {
  /** 0~100 */
  value?: number
  indeterminate?: boolean
  className?: string
}

/**
 * 진행률 바
 * @param {ProgressBarProps} props - 진행률 props
 * @returns {React.ReactElement} - 프로그레스 바
 */
export function ProgressBar({ value = 0, indeterminate = false, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={cn(
        'h-2 overflow-hidden rounded-full bg-[var(--color-surface-raised)]',
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
    >
      <div
        className={cn(
          'h-full rounded-full bg-[var(--color-accent)]',
          indeterminate && 'w-1/3 animate-pulse',
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  )
}
