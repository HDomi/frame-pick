'use client'

import { cn } from '@/lib/cn'

interface ResizeHandleProps {
  orientation?: 'vertical' | 'horizontal'
  onDrag: (deltaPx: number) => void
  /** 드래그 시작 (캔버스 fit 일시 중지 등) */
  onDragStart?: () => void
  /** 드래그 종료 시 (캔버스 fit 최종 동기화 등) */
  onDragEnd?: () => void
  className?: string
}

/**
 * 패널 경계 드래그 리사이즈 핸들
 * @param {ResizeHandleProps} props - 핸들 props
 * @returns {React.ReactElement}
 */
export function ResizeHandle({
  orientation = 'vertical',
  onDrag,
  onDragStart,
  onDragEnd,
  className,
}: ResizeHandleProps) {
  /**
   * 드래그 시작
   * @param {React.PointerEvent<HTMLDivElement>} event - pointer 이벤트
   * @returns {void}
   */
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    onDragStart?.()

    let last = orientation === 'vertical' ? event.clientX : event.clientY

    /**
     * 드래그 중
     * @param {PointerEvent} moveEvent - move
     * @returns {void}
     */
    const handleMove = (moveEvent: PointerEvent) => {
      const current = orientation === 'vertical' ? moveEvent.clientX : moveEvent.clientY
      const delta = current - last
      last = current
      if (delta !== 0) {
        onDrag(delta)
      }
    }

    /**
     * 드래그 종료
     * @returns {void}
     */
    const handleUp = () => {
      target.releasePointerCapture(event.pointerId)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      onDragEnd?.()
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onPointerDown={handlePointerDown}
      className={cn(
        'shrink-0 bg-[var(--color-border)] transition-colors hover:bg-[var(--color-accent)]',
        orientation === 'vertical'
          ? 'w-1 cursor-col-resize'
          : 'h-1 cursor-row-resize',
        className,
      )}
    />
  )
}
