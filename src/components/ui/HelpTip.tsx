'use client'

import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'
import { EDITOR_HELP_NOTES } from '@/lib/editor-help'
import { cn } from '@/lib/cn'

interface HelpTipProps {
  className?: string
}

/**
 * 헤더용 원형 ? 도움말 — 호버(포커스) 시 브라우저/코덱 안내
 * @param {HelpTipProps} props - className
 * @returns {React.ReactElement}
 */
export function HelpTip({ className }: HelpTipProps) {
  return (
    <div className={cn('group relative inline-flex', className)}>
      <button
        type="button"
        aria-label="편집 환경 안내"
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-full',
          'border border-[var(--color-border)] text-[var(--color-text-muted)]',
          'transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]',
          'focus-visible:border-[var(--color-accent)] focus-visible:text-[var(--color-accent)] focus-visible:outline-none',
        )}
      >
        <HelpOutlineIcon sx={{ fontSize: 18 }} />
      </button>

      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute top-full left-0 z-[90] mt-2 w-[min(22rem,calc(100vw-2rem))]',
          'origin-top-left scale-95 opacity-0 transition',
          'group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100',
          'group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100',
        )}
      >
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-[var(--color-text)]">
            영상·브라우저 안내
          </p>
          <ul className="flex flex-col gap-2">
            {EDITOR_HELP_NOTES.map((note) => (
              <li
                key={note}
                className="text-[11px] leading-relaxed text-[var(--color-text-muted)]"
              >
                · {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
