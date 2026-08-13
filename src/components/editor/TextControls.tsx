'use client'

import { ColorPicker, FormField } from '@/components/ui'
import { useRecentColors } from '@/hooks/useRecentColors'
import { useTextFill } from '@/hooks/useTextFill'

/**
 * 텍스트 폰트/외곽선/색상 컨트롤
 * @returns {React.ReactElement} - 텍스트 스타일 컨트롤
 */
export function TextControls() {
  const { fill, hasTextTarget, hasSelection, applyFill } = useTextFill()
  const { recentColors, rememberColor } = useRecentColors()

  /**
   * 색상 변경 핸들러
   * @param {string} hex - 선택한 색상
   * @returns {void}
   */
  const handleColorChange = (hex: string) => {
    const applied = applyFill(hex)
    if (applied) {
      void rememberColor(hex)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="폰트">
        <select
          disabled
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 opacity-70"
        >
          <option>Noto Sans KR</option>
        </select>
      </FormField>

      <FormField label="외곽선">
        <input type="range" disabled min={0} max={20} defaultValue={4} className="opacity-70" />
      </FormField>

      <ColorPicker
        label={hasSelection ? '선택 글자 색상' : '텍스트 색상'}
        value={fill}
        recentColors={recentColors}
        disabled={!hasTextTarget}
        helperText={
          hasTextTarget
            ? hasSelection
              ? '선택한 글자에만 색상이 적용됩니다.'
              : '텍스트를 더블클릭한 뒤 글자를 드래그하면 일부만 색칠할 수 있습니다.'
            : '캔버스에서 텍스트 레이어를 선택하세요.'
        }
        onChange={handleColorChange}
      />
    </div>
  )
}
