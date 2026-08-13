import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelSectionProps {
  title: string
  children: ReactNode
  className?: string
}

/**
 * 사이드 패널 섹션 (제목 + 본문)
 * @param {PanelSectionProps} props - 섹션 props
 * @returns {React.ReactElement} - 패널 섹션
 */
export function PanelSection({ title, children, className }: PanelSectionProps) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {title}
      </h2>
      {children}
    </section>
  )
}
