'use client'

import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import { IconButton } from '@/components/ui'
import { useCanvasViewportZoom } from '@/hooks/useCanvasViewportZoom'
import { cn } from '@/lib/cn'

/**
 * 편집 뷰포트 줌 컨트롤 (다운로드 해상도와 무관)
 * @returns {React.ReactElement}
 */
export function CanvasZoomControls() {
  const { zoomPercent, zoomIn, zoomOut, zoomToFit, isPanning } = useCanvasViewportZoom()

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-0.5 rounded-lg border border-[var(--color-border)]',
        'px-1 py-0.5 shadow-lg backdrop-blur-sm',
      )}
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 94%, transparent)' }}
      title="빈 곳 드래그: 이동 · Shift+드래그: 다중선택 · 스크롤: 이동 · ⌘/Ctrl+휠: 줌"
    >
      <IconButton
        label="축소"
        className="size-8 text-[var(--color-text)]"
        onClick={zoomOut}
      >
        <RemoveIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <button
        type="button"
        className="min-w-14 rounded px-1 py-1 text-center text-xs font-medium text-[var(--color-text)] tabular-nums hover:bg-[var(--color-surface-raised)]"
        onClick={zoomToFit}
        aria-label="화면에 맞춤 (100%)"
      >
        {zoomPercent}%
      </button>
      <IconButton
        label="확대"
        className="size-8 text-[var(--color-text)]"
        onClick={zoomIn}
      >
        <AddIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <IconButton
        label="화면에 맞춤"
        className="size-8 text-[var(--color-text)]"
        onClick={zoomToFit}
      >
        <FitScreenIcon sx={{ fontSize: 18 }} />
      </IconButton>
      {isPanning ? (
        <span className="px-1.5 text-[10px] text-[var(--color-text-muted)]">이동</span>
      ) : null}
    </div>
  )
}
