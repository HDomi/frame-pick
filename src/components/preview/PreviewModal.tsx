'use client'

import { Modal } from '@/components/ui'

interface PreviewModalProps {
  isOpen: boolean
  previewUrl: string | null
  resolutionLabel: string
  onClose: () => void
}

/**
 * 현재 썸네일 작업 미리보기 다이얼로그
 * @param {PreviewModalProps} props - 미리보기 props
 * @returns {React.ReactElement | null} - 미리보기 모달
 */
export function PreviewModal({
  isOpen,
  previewUrl,
  resolutionLabel,
  onClose,
}: PreviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="썸네일 미리보기"
      showCloseButton
      onClose={onClose}
      className="max-w-4xl"
    >
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">{resolutionLabel}</p>
      <div className="overflow-hidden rounded-md border border-[var(--color-border)] bg-black">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="작업 중인 썸네일 미리보기"
            className="block h-auto w-full"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-sm text-[var(--color-text-muted)]">
            미리보기를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </Modal>
  )
}
