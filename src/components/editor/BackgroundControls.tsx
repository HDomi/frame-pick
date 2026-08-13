'use client'

import { ColorPicker } from '@/components/ui'
import { useBackgroundLayer } from '@/hooks/useBackgroundLayer'
import { useRecentColors } from '@/hooks/useRecentColors'

/**
 * 캔버스 배경 색상 컨트롤 (배경은 삭제 불가)
 * @returns {React.ReactElement}
 */
export function BackgroundControls() {
  const { fill, isReady, applyFill } = useBackgroundLayer()
  const { recentColors, rememberColor } = useRecentColors()

  /**
   * 배경 색상 변경
   * @param {string} hex - hex 색상
   * @returns {void}
   */
  const handleColorChange = (hex: string) => {
    applyFill(hex)
    void rememberColor(hex)
  }

  return (
    <ColorPicker
      label="배경 색상"
      value={fill}
      recentColors={recentColors}
      disabled={!isReady}
      helperText="배경은 삭제할 수 없습니다. 색상만 변경할 수 있습니다."
      onChange={handleColorChange}
    />
  )
}
