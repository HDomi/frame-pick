import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

/**
 * 아이콘 전용 버튼 (닫기 등)
 * @param {IconButtonProps} props - 버튼 props
 * @returns {React.ReactElement} - 아이콘 버튼
 */
export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
