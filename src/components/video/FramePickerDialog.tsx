'use client'

import { useState } from 'react'
import { Button, FrameThumb, Modal, SegmentedControl } from '@/components/ui'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { DEFAULT_IMAGE_FIT, FRAME_SAMPLE_MAX_RATIO } from '@/lib/constants'
import type { ImageFitMode } from '@/lib/image-layer'
import { FRAME_APPLY_MAX_EDGE } from '@/lib/video-constants'
import { captureFrameAtTime, formatTimecode } from '@/lib/video-frame-extractor'
import type { ExtractedFrame } from '@/types/editor'

const FIT_OPTIONS: { value: ImageFitMode; label: string; title: string }[] = [
  { value: 'cover', label: 'Cover', title: '채우기(크롭)' },
  { value: 'contain', label: 'Contain', title: '맞춤(레터박스)' },
  { value: 'stretch', label: 'Stretch', title: '늘리기' },
]

/**
 * 추출 프레임 선택 다이얼로그 — 추천 + 수동 시킹 + fit
 * @returns {React.ReactElement | null}
 */
export function FramePickerDialog() {
  const {
    frames,
    isDialogOpen,
    closeDialog,
    videoName,
    videoDuration,
    videoFile,
    captureManualFrame,
  } = useVideoSession()
  const { applyVideoFrame } = useCanvasImage()
  const { withLoading } = useLoading()
  const { toast } = useToast()
  const [fit, setFit] = useState<ImageFitMode>(DEFAULT_IMAGE_FIT)
  const [seekSec, setSeekSec] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const maxSeek = Math.max(videoDuration, 0)

  /**
   * 프레임을 고해상도로 재캡처한 뒤 영상이미지 레이어에 적용한다.
   * @param {ExtractedFrame} frame - 선택 프레임
   * @returns {Promise<void>}
   */
  const handleSelectFrame = async (frame: ExtractedFrame) => {
    setSelectedId(frame.id)
    try {
      const ok = await withLoading(async () => {
        let dataUrl = frame.dataUrl
        if (videoFile) {
          const full = await captureFrameAtTime(videoFile, frame.timeSec, {
            maxEdge: FRAME_APPLY_MAX_EDGE,
          })
          dataUrl = full.dataUrl
        }
        return applyVideoFrame(dataUrl, fit)
      }, '영상이미지 적용 중…')

      if (!ok) {
        toast({ message: '캔버스가 준비되지 않았습니다.', variant: 'error' })
        return
      }
      closeDialog()
      toast({ message: `영상이미지 적용 (${fit})`, variant: 'success' })
    } catch {
      toast({
        message:
          '프레임 적용에 실패했습니다. Chrome + MP4(H.264)를 권장합니다.',
        variant: 'error',
      })
    }
  }

  /**
   * 수동 시킹 캡처 후 바로 적용한다.
   * @returns {Promise<void>}
   */
  const handleManualCaptureApply = async () => {
    const frame = await captureManualFrame(seekSec)
    if (!frame) {
      return
    }
    await handleSelectFrame(frame)
  }

  /**
   * 수동 시킹 캡처만 목록에 추가한다.
   * @returns {Promise<void>}
   */
  const handleManualCaptureOnly = async () => {
    await captureManualFrame(seekSec)
  }

  return (
    <Modal
      isOpen={isDialogOpen}
      title="프레임 선택"
      showCloseButton
      onClose={closeDialog}
      className="max-w-3xl"
      footer={
        <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
          <p>
            자동 추천은 0~{Math.round(FRAME_SAMPLE_MAX_RATIO * 100)}% 구간입니다. 시킹은 키프레임
            단위라 시점과 조금 다를 수 있습니다.
          </p>
          <p>목록 섬네일은 축소본이며, 적용 시 고해상도로 다시 캡처합니다.</p>
        </div>
      }
    >
      {videoName ? (
        <p className="mb-2 truncate text-xs text-[var(--color-text-muted)]">{videoName}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">배치(Fit)</span>
        <SegmentedControl value={fit} options={FIT_OPTIONS} onChange={setFit} />
      </div>

      <p className="mb-2 text-xs font-medium text-[var(--color-text)]">
        추천 프레임 ({frames.length})
      </p>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {frames.map((frame) => (
          <FrameThumb
            key={frame.id}
            selected={selectedId === frame.id}
            className="h-auto w-full aspect-video p-0"
            onClick={() => {
              void handleSelectFrame(frame)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.dataUrl}
              alt={`${frame.index + 1}번째 · ${formatTimecode(frame.timeSec)}`}
              className="h-full w-full object-cover"
            />
          </FrameThumb>
        ))}
      </div>

      {videoFile && maxSeek > 0 ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <p className="mb-1 text-xs font-medium text-[var(--color-text)]">수동 시킹</p>
          <p className="mb-2 text-[11px] text-[var(--color-text-muted)]">
            키프레임 스냅으로 위치가 조금 어긋날 수 있습니다.
          </p>
          <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
            <span>{formatTimecode(seekSec)}</span>
            <span>/ {formatTimecode(maxSeek)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxSeek}
            step={0.1}
            value={Math.min(seekSec, maxSeek)}
            onChange={(event) => {
              setSeekSec(Number(event.target.value))
            }}
            className="mb-3 w-full"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void handleManualCaptureOnly()
              }}
            >
              이 시점 캡처 추가
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                void handleManualCaptureApply()
              }}
            >
              캡처 후 적용
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
