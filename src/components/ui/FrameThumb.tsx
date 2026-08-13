import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FrameThumbProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: ReactNode
}

/**
 * 프레임 갤러리용 섬네일 버튼
 * @param {FrameThumbProps} props - 섬네일 props
 * @returns {React.ReactElement} - 프레임 섬네일
 */
export function FrameThumb({ selected = false, className, children, ...rest }: FrameThumbProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded border bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)]',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
