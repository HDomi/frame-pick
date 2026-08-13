import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FileDropzoneProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> {
  title: string
  description?: string
  icon?: ReactNode
  className?: string
}

/**
 * 파일 선택용 점선 드롭존
 * @param {FileDropzoneProps} props - 드롭존 props
 * @returns {React.ReactElement} - 파일 드롭존
 */
export function FileDropzone({
  title,
  description,
  icon,
  className,
  disabled,
  ...inputProps
}: FileDropzoneProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-4 text-center transition-colors hover:border-[var(--color-accent)]',
        disabled && 'pointer-events-none cursor-not-allowed opacity-60',
        className,
      )}
    >
      {icon}
      <span className="text-sm">{title}</span>
      {description ? (
        <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
      ) : null}
      <input type="file" className="hidden" disabled={disabled} {...inputProps} />
    </label>
  )
}
