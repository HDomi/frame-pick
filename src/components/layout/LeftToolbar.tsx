'use client'

import { useRef } from 'react'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import TitleIcon from '@mui/icons-material/Title'
import { BackgroundRemovalButton } from '@/components/ai/BackgroundRemovalButton'
import { StickerPanel } from '@/components/editor/StickerPanel'
import { IconButton, PanelSection } from '@/components/ui'
import { VideoUploader } from '@/components/video/VideoUploader'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { useCanvasText } from '@/hooks/useCanvasText'
import { cn } from '@/lib/cn'

/**
 * 툴바용 사각 아이콘 버튼 공통 클래스
 */
const TOOL_ICON_CLASS = cn(
  'size-10 border border-[var(--color-border)] bg-[var(--color-surface-raised)]',
  'hover:border-[var(--color-accent)] disabled:opacity-60',
)

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

      <PanelSection title="추가">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            void handleImageFileChange(event)
          }}
        />
        <div className="flex flex-wrap gap-2">
          <IconButton
            label="이미지 업로드"
            disabled={!toolsEnabled}
            className={TOOL_ICON_CLASS}
            onClick={handleImageUploadClick}
          >
            <ImageOutlinedIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <BackgroundRemovalButton />
          <IconButton
            label="텍스트 추가"
            disabled={!toolsEnabled}
            className={TOOL_ICON_CLASS}
            onClick={() => {
              void handleAddText()
            }}
          >
            <TitleIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)]">
          이미지 · 누끼 스티커 · 텍스트 (마우스를 올리면 설명이 나옵니다)
        </p>
      </PanelSection>

      <PanelSection title="스티커">
        <StickerPanel />
      </PanelSection>
    </aside>
  )
}
