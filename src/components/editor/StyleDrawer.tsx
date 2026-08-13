'use client'

import { useEffect, useId, useRef, useState } from 'react'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import { StylePanelContent } from '@/components/editor/StylePanelContent'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * 우측 패널용 스타일 드로어 — 버튼 아래쪽으로 열림 / 바깥·Esc 닫기
 * @returns {React.ReactElement}
 */
export function StyleDrawer() {
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
    <div ref={rootRef} className="relative z-20 flex min-h-0 flex-col">
      <Button
        variant={open ? 'primary' : 'secondary'}
        size="sm"
        fullWidth
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((prev) => !prev)
        }}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <PaletteOutlinedIcon sx={{ fontSize: 16 }} />
          스타일
        </span>
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="스타일"
          className={cn(
            'mt-2 flex min-h-0 flex-1 flex-col',
            'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-md',
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">스타일</h3>
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
          <div className="min-h-0 max-h-[min(52vh,480px)] flex-1 overflow-y-auto overscroll-contain p-3">
            <StylePanelContent />
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
          배경·이미지·텍스트. 바깥 클릭 또는 Esc로 닫기.
        </p>
      )}
    </div>
  )
}
