'use client'

import { Button, FileDropzone } from '@/components/ui'
import { useVideoSession } from '@/contexts/VideoSessionContext'

/**
 * 영상 업로드 + 업로드 완료 후 유지 카드 (클릭 시 프레임 다이얼로그)
 * @returns {React.ReactElement}
 */
export function VideoUploader() {
  const { hasVideo, videoName, uploadVideo, openDialog, clearVideo } = useVideoSession()

  /**
   * 파일 선택 핸들러
   * @param {React.ChangeEvent<HTMLInputElement>} event - input change
   * @returns {void}
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    void uploadVideo(file)
  }

  return (
    <div className="flex flex-col gap-2">
      {hasVideo ? (
        <button
          type="button"
          onClick={openDialog}
          className="w-full rounded-md border border-[var(--color-accent)] bg-[var(--color-surface-raised)] px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface)]"
        >
          <span className="block text-sm font-medium text-[var(--color-text)]">
            업로드된 영상
          </span>
          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
            {videoName}
          </span>
          <span className="mt-2 block text-[11px] text-[var(--color-accent)]">
            클릭하여 추천 프레임 다시 선택
          </span>
        </button>
      ) : null}

      <FileDropzone
        title={hasVideo ? '다른 영상 업로드' : '영상 업로드'}
        description="MP4, WebM, MOV"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
      />

      {hasVideo ? (
        <Button variant="ghost" size="sm" fullWidth onClick={clearVideo}>
          영상 제거
        </Button>
      ) : null}
    </div>
  )
}
