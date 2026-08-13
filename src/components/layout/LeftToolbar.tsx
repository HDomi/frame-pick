'use client'

import { useRef } from 'react'
import { BackgroundRemovalButton } from '@/components/ai/BackgroundRemovalButton'
import { StickerPanel } from '@/components/editor/StickerPanel'
import { Button, PanelSection } from '@/components/ui'
import { VideoUploader } from '@/components/video/VideoUploader'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { useCanvasText } from '@/hooks/useCanvasText'

/**
 * 좌측 툴바: 영상/이미지/누끼/텍스트/스티커
 * @returns {React.ReactElement} - 좌측 툴바
 */
export function LeftToolbar() {
  const { isReady } = useCanvas()
  const { addText } = useCanvasText()
  const { addUploadedImage } = useCanvasImage()
  const { withLoading, isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const { toast } = useToast()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const locked = isLoading || isExtracting
  const toolsEnabled = isReady && !locked

  /**
   * 텍스트 추가 클릭
   * @returns {Promise<void>}
   */
  const handleAddText = async () => {
    if (!toolsEnabled) {
      toast({ message: '추출/처리 중에는 편집할 수 없습니다.', variant: 'info' })
      return
    }
    await addText()
    toast({ message: '텍스트를 추가했습니다.', variant: 'success' })
  }

  /**
   * 이미지 업로드 버튼 — 파일 선택 창 오픈
   * @returns {void}
   */
  const handleImageUploadClick = () => {
    if (!toolsEnabled) {
      toast({ message: '추출/처리 중에는 편집할 수 없습니다.', variant: 'info' })
      return
    }
    imageInputRef.current?.click()
  }

  /**
   * 「업로드된이미지」 레이어 추가
   * @param {React.ChangeEvent<HTMLInputElement>} event - change
   * @returns {Promise<void>}
   */
  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ message: '이미지 파일만 업로드할 수 있습니다.', variant: 'error' })
      return
    }

    try {
      const ok = await withLoading(
        async () => addUploadedImage(file),
        '이미지 업로드 중…',
      )
      if (!ok) {
        toast({ message: '이미지 추가에 실패했습니다.', variant: 'error' })
        return
      }
      toast({ message: '업로드된이미지 레이어를 추가했습니다.', variant: 'success' })
    } catch {
      toast({ message: '이미지 업로드에 실패했습니다.', variant: 'error' })
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto bg-[var(--color-surface)] p-3">
      <PanelSection title="영상 추출">
        <VideoUploader />
      </PanelSection>

      <PanelSection title="이미지">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            void handleImageFileChange(event)
          }}
        />
        <Button
          variant="tool"
          size="lg"
          fullWidth
          disabled={!toolsEnabled}
          onClick={handleImageUploadClick}
        >
          이미지 업로드
        </Button>
        <BackgroundRemovalButton />
      </PanelSection>

      <PanelSection title="텍스트">
        <Button
          variant="tool"
          size="lg"
          fullWidth
          disabled={!toolsEnabled}
          onClick={handleAddText}
        >
          텍스트 추가
        </Button>
      </PanelSection>

      <PanelSection title="스티커">
        <StickerPanel />
      </PanelSection>
    </aside>
  )
}
