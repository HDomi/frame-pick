'use client'

import { CanvasViewport } from '@/components/canvas/CanvasViewport'
import { LeftToolbar } from '@/components/layout/LeftToolbar'
import { MobileEditorSheet } from '@/components/layout/MobileEditorSheet'
import { RightPanel } from '@/components/layout/RightPanel'
import { ResizeHandle } from '@/components/ui'
import { FramePickerDialog } from '@/components/video/FramePickerDialog'
import { useCanvasEditLock } from '@/hooks/useCanvasEditLock'
import { useIsMobileLayout } from '@/hooks/useMediaQuery'
import { usePanelLayout } from '@/hooks/usePanelLayout'
import { PANEL_RESIZE_EVENT } from '@/lib/constants'

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
 * - md 이상(태블릿~PC): 3단 리사이즈 레이아웃
 * - md 미만: 캔버스 + 하단 시트형 툴바
 * @returns {React.ReactElement}
 */
export function EditorWorkspace() {
  const isMobile = useIsMobileLayout()
  const { shellRef, layout, resizeLeftByDelta, resizeRightByDelta } = usePanelLayout()
  useCanvasEditLock()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={shellRef} className="flex min-h-0 flex-1">
        {!isMobile ? (
          <>
            <div
              className="min-h-0 shrink-0 overflow-hidden border-r border-[var(--color-border)]"
              style={{ width: `${layout.leftPanelPct}%` }}
            >
              <LeftToolbar />
            </div>
            <ResizeHandle
              onDrag={resizeLeftByDelta}
              onDragStart={() => emitPanelResize('start')}
              onDragEnd={() => emitPanelResize('end')}
            />
          </>
        ) : null}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <CanvasViewport />
        </main>

        {!isMobile ? (
          <>
            <ResizeHandle
              onDrag={resizeRightByDelta}
              onDragStart={() => emitPanelResize('start')}
              onDragEnd={() => emitPanelResize('end')}
            />
            <div
              className="relative z-10 min-h-0 shrink-0 overflow-visible border-l border-[var(--color-border)]"
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
