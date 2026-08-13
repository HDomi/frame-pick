import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface AspectFrameProps {
  aspectRatio: number
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * 비율 고정 프레임 (캔버스 뷰포트 등)
 * @param {AspectFrameProps} props - 프레임 props
 * @returns {React.ReactElement} - 비율 프레임
 */
export function AspectFrame({ aspectRatio, children, className, style }: AspectFrameProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-lg',
        className,
      )}
      style={{ aspectRatio, ...style }}
    >
      {children}
    </div>
  )
}
