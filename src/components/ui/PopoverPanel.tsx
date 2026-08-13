'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface PopoverPanelProps {
  /** 트리거 버튼 라벨 */
  label: string
  /** 패널 제목 */
  title?: string
  children: ReactNode
  className?: string
  /** 패널 너비 등 */
  panelClassName?: string
  disabled?: boolean
}

/**
 * 클릭으로 열고 바깥 클릭·Esc로 닫히는 팝오버 패널
 * @param {PopoverPanelProps} props
 * @returns {React.ReactElement}
 */
export function PopoverPanel({
  label,
  title,
  children,
  className,
  panelClassName,
  disabled = false,
}: PopoverPanelProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        variant={open ? 'primary' : 'secondary'}
        size="sm"
        fullWidth
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((prev) => !prev)
        }}
      >
        {label}
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={title ?? label}
          className={cn(
            'absolute right-0 z-40 mt-2 flex max-h-[min(70vh,560px)] w-[min(100vw-2rem,320px)] flex-col',
            'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl',
            panelClassName,
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{title ?? label}</h3>
            <button
              type="button"
              className="rounded px-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="닫기"
              onClick={() => {
                setOpen(false)
              }}
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
        </div>
      ) : null}
    </div>
  )
}
