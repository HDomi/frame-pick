'use client'

import { CanvasViewport } from '@/components/canvas/CanvasViewport'
import { CanvasZoomControls } from '@/components/canvas/CanvasZoomControls'
import { LeftToolbar } from '@/components/layout/LeftToolbar'
import { MobileEditorSheet } from '@/components/layout/MobileEditorSheet'
import { RightPanel } from '@/components/layout/RightPanel'
import { ResizeHandle } from '@/components/ui'
import { FramePickerDialog } from '@/components/video/FramePickerDialog'
import { useCanvasEditLock } from '@/hooks/useCanvasEditLock'
import { useCanvasClipboard } from '@/hooks/useCanvasClipboard'
import { useCanvasSnap } from '@/hooks/useCanvasSnap'
import { useIsMobileLayout } from '@/hooks/useMediaQuery'
import { usePanelLayout } from '@/hooks/usePanelLayout'
import { useTextOverflowGuard } from '@/hooks/useTextOverflowGuard'
import { PANEL_RESIZE_EVENT } from '@/lib/constants'
import { WORKSPACE_BG } from '@/lib/image-sticker'
import { cn } from '@/lib/cn'

/**
 * 패널 리사이즈 단계를 브로드캐스트한다.
 * @param {'start' | 'end'} phase - 단계
 * @returns {void}
 */
function emitPanelResize(phase: 'start' | 'end'): void {
  window.dispatchEvent(
    new CustomEvent(PANEL_RESIZE_EVENT, {
      detail: { phase },
    }),
  )
}

/**
 * 에디터 워크스페이스
 * - md 이상: 전체 편집 여백(z-0) 위에 좌·우 패널(z-1) 오버레이
 * - md 미만: 캔버스 + 하단 시트형 툴바
 * @returns {React.ReactElement}
 */
export function EditorWorkspace() {
  const isMobile = useIsMobileLayout()
  const { shellRef, layout, resizeLeftByDelta, resizeRightByDelta } = usePanelLayout()
  useCanvasEditLock()
  useCanvasClipboard()
  useCanvasSnap()
  useTextOverflowGuard()

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div
        ref={shellRef}
        className="relative min-h-0 min-w-0 w-full flex-1 overflow-hidden"
        style={{ backgroundColor: WORKSPACE_BG }}
      >
        {/* z-0: 전체 편집용 여백 + 아트보드 */}
        <div className="absolute inset-0 z-0">
          <CanvasViewport />
        </div>

        {/* 줌 컨트롤 — 패널 사이 중앙 하단 */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-[1] -translate-x-1/2">
          <CanvasZoomControls />
        </div>

        {!isMobile ? (
          <>
            {/* z-1: 좌측 패널 */}
            <div
              className={cn(
                'absolute inset-y-0 left-0 z-[1] min-h-0 overflow-hidden',
                'border-r border-[var(--color-border)] shadow-[4px_0_24px_rgba(0,0,0,0.35)]',
              )}
              style={{ width: `${layout.leftPanelPct}%` }}
            >
              <LeftToolbar />
            </div>
            <div
              className="absolute inset-y-0 z-[1] flex w-1"
              style={{ left: `calc(${layout.leftPanelPct}% - 2px)` }}
            >
              <ResizeHandle
                className="h-full w-1"
                onDrag={resizeLeftByDelta}
                onDragStart={() => emitPanelResize('start')}
                onDragEnd={() => emitPanelResize('end')}
              />
            </div>

            {/* z-1: 우측 패널 */}
            <div
              className="absolute inset-y-0 z-[1] flex w-1"
              style={{ right: `calc(${layout.rightPanelPct}% - 2px)` }}
            >
              <ResizeHandle
                className="h-full w-1"
                onDrag={resizeRightByDelta}
                onDragStart={() => emitPanelResize('start')}
                onDragEnd={() => emitPanelResize('end')}
              />
            </div>
            <div
              className={cn(
                'absolute inset-y-0 right-0 z-[1] min-h-0 overflow-hidden',
                'border-l border-[var(--color-border)] shadow-[-4px_0_24px_rgba(0,0,0,0.35)]',
              )}
              style={{ width: `${layout.rightPanelPct}%` }}
            >
              <RightPanel />
            </div>
          </>
        ) : null}
      </div>

      {isMobile ? <MobileEditorSheet /> : null}
      <FramePickerDialog />
    </div>
  )
}
