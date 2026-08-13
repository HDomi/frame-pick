import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FormFieldProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * 라벨 + 컨트롤 폼 필드
 * @param {FormFieldProps} props - 필드 props
 * @returns {React.ReactElement} - 폼 필드
 */
export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <label className={cn('flex flex-col gap-1 text-sm text-[var(--color-text-muted)]', className)}>
      <span className="text-xs">{label}</span>
      {children}
    </label>
  )
}
