'use client'

import { FillPicker } from '@/components/ui'
import { useBackgroundLayer } from '@/hooks/useBackgroundLayer'
import { useRecentColors } from '@/hooks/useRecentColors'
import type { FillValue } from '@/lib/fill-value'

/**
 * 캔버스 배경 채움 컨트롤 (배경은 삭제 불가)
 * @returns {React.ReactElement}
 */
export function BackgroundControls() {
  const { fill, isReady, applyFill } = useBackgroundLayer()
  const { recentColors, rememberColor } = useRecentColors()

  /**
   * 배경 채움 변경
   * @param {FillValue} next
   * @returns {void}
   */
  const handleFillChange = (next: FillValue) => {
    applyFill(next)
    if (next.mode === 'solid') {
      void rememberColor(next.color)
    } else {
      void rememberColor(next.colorA)
      void rememberColor(next.colorB)
    }
  }

  return (
    <FillPicker
      label="배경 채움"
      value={fill}
      recentColors={recentColors}
      disabled={!isReady}
      helperText="배경은 삭제할 수 없습니다. 단색·그라데이션만 변경할 수 있습니다."
      onChange={handleFillChange}
    />
  )
}
