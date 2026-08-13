'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

/**
 * 세그먼트 선택 컨트롤
 * @param {SegmentedControlProps} props - 컨트롤 props
 * @returns {React.ReactElement} - 세그먼트 컨트롤
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'sm',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-0.5',
        className,
      )}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value

        return (
          <SegmentButton
            key={option.value}
            selected={selected}
            size={size}
            title={option.title}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </SegmentButton>
        )
      })}
    </div>
  )
}

interface SegmentButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
  size: 'sm' | 'md'
}

/**
 * 세그먼트 개별 버튼
 * @param {SegmentButtonProps} props - 버튼 props
 * @returns {React.ReactElement} - 세그먼트 버튼
 */
function SegmentButton({ selected, size, className, children, ...rest }: SegmentButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded px-2 font-medium transition-colors',
        size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm',
        selected
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        className,
      )}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  )
}
