'use client'

import { ColorPicker, FillPicker, FormField } from '@/components/ui'
import { useRecentColors } from '@/hooks/useRecentColors'
import { useShapeStyle } from '@/hooks/useShapeStyle'
import { formatHexColor } from '@/lib/color-repository'
import type { FillValue } from '@/lib/fill-value'
import { cn } from '@/lib/cn'

/**
 * 도형·직선 채움/선 컨트롤 (투명 채움·8자리 hex 지원)
 * @returns {React.ReactElement}
 */
export function ShapeControls() {
  const { style, hasShapeTarget, applyStylePatch } = useShapeStyle()
  const { recentColors, rememberColor } = useRecentColors()

  /**
   * @param {FillValue} next
   * @returns {void}
   */
  const handleFillChange = (next: FillValue) => {
    applyStylePatch({ fill: next })
    if (next.mode === 'solid') {
      void rememberColor(formatHexColor(next.color, next.opacity))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!style.isLine ? (
        <FillPicker
          label="채움"
          value={style.fill}
          recentColors={recentColors}
          disabled={!hasShapeTarget}
          allowGradient={false}
          helperText="투명도 0% 또는 #rrggbb00 으로 투명 채움"
          onChange={handleFillChange}
        />
      ) : null}

      <ColorPicker
        label="선 색"
        value={style.stroke}
        recentColors={recentColors}
        disabled={!hasShapeTarget}
        onChange={(hex) => {
          applyStylePatch({ stroke: hex })
          void rememberColor(hex)
        }}
      />

      <FormField label={`선 두께 (${Math.round(style.strokeWidth)})`}>
        <input
          type="range"
          min={0}
          max={48}
          step={1}
          disabled={!hasShapeTarget}
          value={style.strokeWidth}
          className={cn('w-full', !hasShapeTarget && 'opacity-70')}
          onChange={(event) => {
            applyStylePatch({ strokeWidth: Number(event.target.value) })
          }}
        />
      </FormField>

      <FormField label={`레이어 투명도 (${Math.round(style.opacity * 100)}%)`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!hasShapeTarget}
          value={Math.round(style.opacity * 100)}
          className={cn('w-full', !hasShapeTarget && 'opacity-70')}
          onChange={(event) => {
            applyStylePatch({ opacity: Number(event.target.value) / 100 })
          }}
        />
      </FormField>

      {!hasShapeTarget ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">
          좌측에서 도형·직선을 추가하거나 캔버스에서 선택하세요.
        </p>
      ) : null}
    </div>
  )
}
