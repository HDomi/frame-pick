'use client'

import { useEffect, useId, useRef, useState } from 'react'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import { IText, Textbox } from 'fabric'
import {
  StylePanelContent,
  type StyleTab,
} from '@/components/editor/StylePanelContent'
import { Button } from '@/components/ui'
import { useCanvas } from '@/hooks/useCanvas'
import { isBackgroundObject } from '@/lib/background-layer'
import type { LayerAwareObject } from '@/lib/layers'
import { cn } from '@/lib/cn'

/**
 * 선택 객체에 맞는 스타일 탭을 고른다.
 * @param {unknown} object
 * @returns {StyleTab | null}
 */
function resolveStyleTab(object: unknown): StyleTab | null {
  if (!object || typeof object !== 'object') {
    return null
  }
  if (isBackgroundObject(object as never)) {
    return 'background'
  }
  const layer = object as LayerAwareObject
  if (layer.layerType === 'background') {
    return 'background'
  }
  if (layer.layerType === 'image' || layer.layerType === 'sticker') {
    return 'image'
  }
  if (
    layer.layerType === 'text' ||
    object instanceof IText ||
    object instanceof Textbox
  ) {
    return 'text'
  }
  return null
}

/**
 * 우측 패널용 스타일 드로어 — 적용 가능 레이어 선택 시 자동 오픈
 * @returns {React.ReactElement}
 */
export function StyleDrawer() {
  const { canvas } = useCanvas()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<StyleTab>('text')
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  /** 방금 캔버스 선택으로 연 경우, 같은 포인터의 outside-close를 한 번 무시 */
  const skipOutsideCloseRef = useRef(false)

  useEffect(() => {
    if (!canvas) {
      return
    }

    /**
     * @returns {void}
     */
    const handleSelection = () => {
      const nextTab = resolveStyleTab(canvas.getActiveObject())
      if (!nextTab) {
        return
      }
      skipOutsideCloseRef.current = true
      setTab(nextTab)
      setOpen(true)
      window.setTimeout(() => {
        skipOutsideCloseRef.current = false
      }, 0)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    handleSelection()

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
    }
  }, [canvas])

  useEffect(() => {
    if (!open) {
      return
    }

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    const handlePointerDown = (event: MouseEvent) => {
      if (skipOutsideCloseRef.current) {
        return
      }
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
            <StylePanelContent tab={tab} onTabChange={setTab} />
          </div>
        </div>
      ) : (
        <p className="mt-1.5 text-[10px] text-[var(--color-text-muted)]">
          레이어를 선택하면 자동으로 열립니다. Esc·바깥 클릭으로 닫기.
        </p>
      )}
    </div>
  )
}
