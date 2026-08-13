import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PlaceholderBoxProps {
  children: ReactNode
  className?: string
}

/**
 * 점선 테두리 placeholder 박스 (광고 슬롯 등)
 * @param {PlaceholderBoxProps} props - 박스 props
 * @returns {React.ReactElement} - placeholder 박스
 */
export function PlaceholderBox({ children, className }: PlaceholderBoxProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
