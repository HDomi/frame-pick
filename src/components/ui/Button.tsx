import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'tool' | 'tile' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60',
  secondary:
    'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] disabled:opacity-60',
  tool: 'border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-left hover:border-[var(--color-accent)] disabled:opacity-60',
  tile: 'border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-accent)] disabled:opacity-60',
  ghost:
    'border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] disabled:opacity-60',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-2 py-1.5 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
}

/**
 * 공통 버튼 컴포넌트
 * @param {ButtonProps} props - 버튼 props
 * @returns {React.ReactElement} - 버튼
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-md transition-colors',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
