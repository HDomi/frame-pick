'use client'

import { Button, ColorPicker, FormField } from '@/components/ui'
import { useRecentColors } from '@/hooks/useRecentColors'
import { useTextFill } from '@/hooks/useTextFill'
import { useTextStyle } from '@/hooks/useTextStyle'
import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'
import { TEXT_PRESET_CATEGORIES } from '@/lib/text-presets'
import { cn } from '@/lib/cn'

/**
 * 텍스트 폰트/외곽선/그림자/프리셋 컨트롤
 * @returns {React.ReactElement}
 */
export function TextControls() {
  const { fill, hasTextTarget, hasSelection, applyFill } = useTextFill()
  const { style, applyStylePatch, applyPreset } = useTextStyle()
  const { recentColors, rememberColor } = useRecentColors()

  /**
   * 채움색 변경
   * @param {string} hex - 색상
   * @returns {void}
   */
  const handleColorChange = (hex: string) => {
    const applied = applyFill(hex)
    if (applied) {
      void rememberColor(hex)
      applyStylePatch({ fill: hex })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FormField label="프리셋">
        <div className="flex flex-col gap-2">
          {TEXT_PRESET_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-1">
              <p className="text-[10px] text-[var(--color-text-muted)]">{category.label}</p>
              <div className="flex flex-wrap gap-1">
                {category.presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="tile"
                    size="sm"
                    className="text-[11px]"
                    onClick={() => {
                      applyPreset(preset)
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormField>

      <FormField label="폰트">
        <select
          disabled={!hasTextTarget}
          value={style.fontFamily}
          className={cn(
            'w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 text-sm',
            !hasTextTarget && 'opacity-70',
          )}
          onChange={(event) => {
            applyStylePatch({ fontFamily: event.target.value })
          }}
        >
          <option value={EDITOR_FONT_FAMILY}>Noto Sans KR</option>
          <option value="sans-serif">Sans Serif</option>
          <option value="serif">Serif</option>
        </select>
      </FormField>

      <FormField label={`외곽선 두께 (${Math.round(style.strokeWidth)})`}>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          disabled={!hasTextTarget}
          value={style.strokeWidth}
          className={cn('w-full', !hasTextTarget && 'opacity-70')}
          onChange={(event) => {
            applyStylePatch({ strokeWidth: Number(event.target.value) })
          }}
        />
      </FormField>

      <ColorPicker
        label="외곽선 색"
        value={style.stroke}
        recentColors={recentColors}
        disabled={!hasTextTarget}
        onChange={(hex) => {
          applyStylePatch({ stroke: hex })
          void rememberColor(hex)
        }}
      />

      <FormField label="효과">
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={style.shadowEnabled}
              disabled={!hasTextTarget}
              onChange={(event) => {
                applyStylePatch({ shadowEnabled: event.target.checked })
              }}
            />
            그림자
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={style.highlightEnabled}
              disabled={!hasTextTarget}
              onChange={(event) => {
                applyStylePatch({ highlightEnabled: event.target.checked })
              }}
            />
            Highlight Box
          </label>
          {style.highlightEnabled ? (
            <ColorPicker
              label="하이라이트 색"
              value={style.highlightColor}
              recentColors={recentColors}
              disabled={!hasTextTarget}
              onChange={(hex) => {
                applyStylePatch({ highlightEnabled: true, highlightColor: hex })
                void rememberColor(hex)
              }}
            />
          ) : null}
        </div>
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
            : '캔버스에서 텍스트 레이어를 선택하거나 프리셋을 누르세요.'
        }
        onChange={handleColorChange}
      />
    </div>
  )
}
