'use client'

import { FillPicker, FormField, SegmentedControl } from '@/components/ui'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { useRecentColors } from '@/hooks/useRecentColors'
import type { FillValue } from '@/lib/fill-value'
import type { ImageFitMode } from '@/lib/image-layer'
import { cn } from '@/lib/cn'

const FIT_OPTIONS: { value: ImageFitMode; label: string; title: string }[] = [
  { value: 'cover', label: 'Cover', title: '채우기(크롭)' },
  { value: 'contain', label: 'Contain', title: '맞춤(레터박스)' },
  { value: 'stretch', label: 'Stretch', title: '늘리기' },
]

/**
 * 선택 이미지/스티커의 fit·투명도·오버레이 컨트롤
 * @returns {React.ReactElement}
 */
export function ImageFitControls() {
  const {
    hasImageTarget,
    selectedImageFit,
    opacity,
    overlayEnabled,
    overlayFill,
    setActiveImageFit,
    setActiveOpacity,
    setActiveOverlay,
    setActiveOverlayFill,
  } = useCanvasImage()
  const { recentColors, rememberColor } = useRecentColors()
  const showFit = selectedImageFit != null

  /**
   * 오버레이 채움 변경
   * @param {FillValue} next
   * @returns {void}
   */
  const handleOverlayFill = (next: FillValue) => {
    void setActiveOverlayFill(next)
    if (next.mode === 'solid') {
      void rememberColor(next.color)
    } else {
      void rememberColor(next.colorA)
      void rememberColor(next.colorB)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {showFit ? (
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
            영상이미지 / 업로드된이미지 Fit
          </p>
        </div>
      ) : null}

      <FormField label={`레이어 투명도 (${Math.round(opacity * 100)}%)`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!hasImageTarget}
          value={Math.round(opacity * 100)}
          className={cn('w-full', !hasImageTarget && 'opacity-70')}
          onChange={(event) => {
            setActiveOpacity(Number(event.target.value) / 100)
          }}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
        <input
          type="checkbox"
          checked={overlayEnabled}
          disabled={!hasImageTarget}
          onChange={(event) => {
            void setActiveOverlay(event.target.checked)
          }}
        />
        색/그라데이션 오버레이
      </label>

      {overlayEnabled ? (
        <FillPicker
          label="오버레이"
          value={overlayFill}
          recentColors={recentColors}
          disabled={!hasImageTarget}
          helperText="단색은 tint, 그라데이션은 multiply로 이미지 위에 섞입니다."
          onChange={handleOverlayFill}
        />
      ) : null}

      {!hasImageTarget ? (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          이미지·이미지 스티커 레이어를 선택하세요. (SVG 스티커 그룹은 제외)
        </p>
      ) : null}
    </div>
  )
}
