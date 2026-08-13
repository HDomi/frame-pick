'use client'

import { FrameThumb, Modal } from '@/components/ui'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvasImage } from '@/hooks/useCanvasImage'

/**
 * 추출 프레임 선택 다이얼로그 — 「영상이미지」 레이어에 적용
 * @returns {React.ReactElement | null}
 */
export function FramePickerDialog() {
  const { frames, isDialogOpen, closeDialog, videoName } = useVideoSession()
  const { applyVideoFrame } = useCanvasImage()
  const { withLoading } = useLoading()
  const { toast } = useToast()

  /**
   * 프레임을 영상이미지 레이어에 적용한다.
   * @param {string} dataUrl - 프레임 data URL
   * @returns {Promise<void>}
   */
  const handleSelectFrame = async (dataUrl: string) => {
    try {
      const ok = await withLoading(
        async () => applyVideoFrame(dataUrl),
        '영상이미지 적용 중…',
      )
      if (!ok) {
        toast({ message: '캔버스가 준비되지 않았습니다.', variant: 'error' })
        return
      }
      closeDialog()
      toast({ message: '영상이미지 레이어에 적용했습니다.', variant: 'success' })
    } catch {
      toast({ message: '프레임 적용에 실패했습니다.', variant: 'error' })
    }
  }

  return (
    <Modal
      isOpen={isDialogOpen}
      title="추천 프레임 선택"
      showCloseButton
      onClose={closeDialog}
      className="max-w-3xl"
      footer={
        <p className="text-xs text-[var(--color-text-muted)]">
          선택한 프레임은 「영상이미지」 레이어에 적용되며, 언제든 다시 골라 교체할 수 있습니다.
        </p>
      }
    >
      {videoName ? (
        <p className="mb-3 truncate text-xs text-[var(--color-text-muted)]">{videoName}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {frames.map((frame) => (
          <FrameThumb
            key={frame.id}
            className="h-auto w-full aspect-video p-0"
            onClick={() => {
              void handleSelectFrame(frame.dataUrl)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frame.dataUrl}
              alt={`${frame.index + 1}번째 프레임`}
              className="h-full w-full object-cover"
            />
          </FrameThumb>
        ))}
      </div>
    </Modal>
  )
}
