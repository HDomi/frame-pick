'use client'

import { Button, Modal, PlaceholderBox, ProgressBar } from '@/components/ui'
import { DOWNLOAD_AD_DELAY_MS } from '@/lib/constants'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * PNG 다운로드 전 광고 대기 모달 stub
 * @param {DownloadModalProps} props - 모달 props
 * @returns {React.ReactElement | null} - 다운로드 모달
 */
export function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="고화질 썸네일 생성 중..."
      onClose={onClose}
      footer={
        <Button variant="ghost" fullWidth onClick={onClose}>
          닫기
        </Button>
      }
    >
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {DOWNLOAD_AD_DELAY_MS / 1000}초 후 PNG가 다운로드됩니다. (광고 연동 예정)
      </p>
      <PlaceholderBox className="mb-4 h-40">광고 영역</PlaceholderBox>
      <ProgressBar indeterminate className="mb-0" />
    </Modal>
  )
}
