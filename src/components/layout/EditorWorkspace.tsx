'use client'

import { CanvasViewport } from '@/components/canvas/CanvasViewport'
import { LeftToolbar } from '@/components/layout/LeftToolbar'
import { MobileEditorSheet } from '@/components/layout/MobileEditorSheet'
import { RightPanel } from '@/components/layout/RightPanel'
import { ResizeHandle } from '@/components/ui'
import { FramePickerDialog } from '@/components/video/FramePickerDialog'
import { useIsMobileLayout } from '@/hooks/useMediaQuery'
import { usePanelLayout } from '@/hooks/usePanelLayout'

/**
 * 에디터 워크스페이스
 * - md 이상(태블릿~PC): 3단 리사이즈 레이아웃
 * - md 미만: 캔버스 + 하단 시트형 툴바
 * @returns {React.ReactElement}
 */
export function EditorWorkspace() {
  const isMobile = useIsMobileLayout()
  const { shellRef, layout, resizeLeftByDelta, resizeRightByDelta } = usePanelLayout()

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
            <ResizeHandle onDrag={resizeLeftByDelta} />
          </>
        ) : null}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <CanvasViewport />
        </main>

        {!isMobile ? (
          <>
            <ResizeHandle onDrag={resizeRightByDelta} />
            <div
              className="min-h-0 shrink-0 overflow-hidden border-l border-[var(--color-border)]"
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
