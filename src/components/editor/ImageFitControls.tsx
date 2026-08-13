'use client'

import { SegmentedControl } from '@/components/ui'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import type { ImageFitMode } from '@/lib/image-layer'

const FIT_OPTIONS: { value: ImageFitMode; label: string; title: string }[] = [
  { value: 'cover', label: 'Cover', title: '채우기(크롭)' },
  { value: 'contain', label: 'Contain', title: '맞춤(레터박스)' },
  { value: 'stretch', label: 'Stretch', title: '늘리기' },
]

/**
 * 선택 이미지 레이어의 fit 모드 컨트롤
 * @returns {React.ReactElement}
 */
export function ImageFitControls() {
  const { hasImageTarget, selectedImageFit, setActiveImageFit } = useCanvasImage()

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        value={selectedImageFit ?? 'cover'}
        options={FIT_OPTIONS}
        disabled={!hasImageTarget}
        onChange={(next) => {
          setActiveImageFit(next)
        }}
      />
      <p className="text-[11px] text-[var(--color-text-muted)]">
        {hasImageTarget
          ? '선택한 이미지(영상이미지/업로드된이미지)에 적용됩니다.'
          : '이미지 레이어를 선택하세요.'}
      </p>
    </div>
  )
}
