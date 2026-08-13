'use client'

import RedoIcon from '@mui/icons-material/Redo'
import UndoIcon from '@mui/icons-material/Undo'
import { PreviewModal } from '@/components/preview/PreviewModal'
import { HeaderMenu } from '@/components/layout/HeaderMenu'
import { Button, HelpTip, IconButton, SegmentedControl } from '@/components/ui'
import { useEditorSession } from '@/contexts/EditorSessionContext'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasDownload } from '@/hooks/useCanvasDownload'
import { useCanvasPreview } from '@/hooks/useCanvasPreview'
import { CANVAS_SIZE_PRESETS, type CanvasSizeId } from '@/lib/canvas-size'

/**
 * 저장 시각을 짧게 표시한다.
 * @param {number | null} timestamp - epoch ms
 * @returns {string}
 */
function formatSavedAt(timestamp: number | null): string {
  if (!timestamp) {
    return ''
  }
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * 상단 헤더: 히스토리/저장/미리보기/다운로드
 * @returns {React.ReactElement} - 앱 헤더
 */
export function AppHeader() {
  const { isReady, canvasSizeId, canvasSize, setCanvasSizeId } = useCanvas()
  const { downloadPng } = useCanvasDownload()
  const { isOpen, previewUrl, openPreview, closePreview } = useCanvasPreview()
  const { withLoading } = useLoading()
  const { toast } = useToast()
  const {
    isHydrated,
    isSaving,
    lastSavedAt,
    canUndo,
    canRedo,
    saveDraftNow,
    resetEditor,
    undo,
    redo,
  } = useEditorSession()

  const controlsEnabled = isReady && isHydrated

  /**
   * PNG 다운로드 클릭
   * @returns {Promise<void>}
   */
  const handleDownloadClick = async () => {
    try {
      const ok = await withLoading(async () => downloadPng(), 'PNG 내보내는 중…')
      if (ok) {
        toast({ message: 'PNG를 다운로드했습니다.', variant: 'success' })
      } else {
        toast({ message: '다운로드에 실패했습니다.', variant: 'error' })
      }
    } catch {
      toast({ message: '다운로드에 실패했습니다.', variant: 'error' })
    }
  }

  /**
   * 임시저장
   * @returns {Promise<void>}
   */
  const handleSave = async () => {
    try {
      await withLoading(async () => saveDraftNow(), '임시저장 중…')
      toast({ message: '임시저장했습니다.', variant: 'success' })
    } catch {
      toast({ message: '저장에 실패했습니다.', variant: 'error' })
    }
  }

  /**
   * 초기화
   * @returns {Promise<void>}
   */
  const handleReset = async () => {
    await resetEditor()
  }

  /**
   * 해상도 프리셋 변경
   * @param {CanvasSizeId} nextId - 선택한 프리셋
   * @returns {void}
   */
  const handleSizeChange = (nextId: CanvasSizeId) => {
    setCanvasSizeId(nextId)
    const label = CANVAS_SIZE_PRESETS.find((preset) => preset.id === nextId)?.label ?? nextId
    toast({ message: `해상도를 ${label}로 변경했습니다.` })
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <HeaderMenu />
          <span className="text-lg font-bold tracking-tight text-[var(--color-text)]">
            Frame Pick
          </span>
          <HelpTip />
          <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">
            유튜브 썸네일 에디터
          </span>
          {lastSavedAt ? (
            <span className="hidden text-[11px] text-[var(--color-text-muted)] md:inline">
              저장 {formatSavedAt(lastSavedAt)}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            label="실행 취소 (Ctrl+Z)"
            disabled={!controlsEnabled || !canUndo}
            onClick={() => {
              void undo().then(() => {
                toast({ message: '실행 취소', variant: 'info', durationMs: 1600 })
              })
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
          <IconButton
            label="다시 실행 (Ctrl+Shift+Z)"
            disabled={!controlsEnabled || !canRedo}
            onClick={() => {
              void redo().then(() => {
                toast({ message: '다시 실행', variant: 'info', durationMs: 1600 })
              })
            }}
          >
            <RedoIcon fontSize="small" />
          </IconButton>

          <SegmentedControl
            value={canvasSizeId}
            onChange={handleSizeChange}
            options={CANVAS_SIZE_PRESETS.map((preset) => ({
              value: preset.id,
              label: preset.label,
              title: preset.description,
            }))}
          />
          <span className="hidden text-xs text-[var(--color-text-muted)] xl:inline">
            {canvasSize.description}
          </span>

          <Button
            variant="secondary"
            disabled={!controlsEnabled || isSaving}
            onClick={() => {
              void handleSave()
            }}
          >
            {isSaving ? '저장 중…' : '임시저장'}
          </Button>
          <Button
            variant="ghost"
            disabled={!controlsEnabled}
            onClick={() => {
              void handleReset()
            }}
          >
            초기화
          </Button>
          <Button variant="secondary" disabled={!controlsEnabled} onClick={openPreview}>
            미리보기
          </Button>
          <Button
            variant="primary"
            disabled={!controlsEnabled}
            onClick={() => {
              void handleDownloadClick()
            }}
          >
            PNG 다운로드
          </Button>
        </div>
      </header>

      <PreviewModal
        isOpen={isOpen}
        previewUrl={previewUrl}
        resolutionLabel={`${canvasSize.label} · ${canvasSize.description}`}
        onClose={closePreview}
      />
    </>
  )
}
