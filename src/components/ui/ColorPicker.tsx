'use client'

import { useEffect, useState } from 'react'
import { FormField } from '@/components/ui/FormField'
import { normalizeHexColor } from '@/lib/color-repository'
import { PRESET_COLORS } from '@/lib/ui-constants'
import { cn } from '@/lib/cn'

interface ColorPickerProps {
  value: string
  recentColors?: string[]
  label?: string
  disabled?: boolean
  helperText?: string
  onChange: (hex: string) => void
}

/**
 * 자유 선택 + 프리셋 + 최근 색상 컬러 피커
 * @param {ColorPickerProps} props - 피커 props
 * @returns {React.ReactElement}
 */
export function ColorPicker({
  value,
  recentColors = [],
  label = '색상',
  disabled = false,
  helperText,
  onChange,
}: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value)

  useEffect(() => {
    setHexInput(value)
  }, [value])

  /**
   * 색상 확정 반영
   * @param {string} next - 후보 색상
   * @returns {void}
   */
  const commitColor = (next: string) => {
    const normalized = normalizeHexColor(next)
    if (!normalized || disabled) {
      return
    }
    setHexInput(normalized)
    onChange(normalized)
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label={label}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeHexColor(value) ?? '#ffffff'}
            disabled={disabled}
            onChange={(event) => commitColor(event.target.value)}
            className="h-9 w-12 shrink-0 rounded border border-[var(--color-border)] bg-transparent p-0.5"
          />
          <input
            type="text"
            value={hexInput}
            disabled={disabled}
            spellCheck={false}
            onChange={(event) => setHexInput(event.target.value)}
            onBlur={() => commitColor(hexInput)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitColor(hexInput)
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2 py-1.5 font-mono text-xs"
            placeholder="#ffffff"
          />
        </div>
      </FormField>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-text-muted)]">프리셋</span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((hex) => (
            <ColorSwatch
              key={hex}
              hex={hex}
              active={normalizeHexColor(value) === hex}
              disabled={disabled}
              onSelect={commitColor}
            />
          ))}
        </div>
      </div>

      {recentColors.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-text-muted)]">최근 색상</span>
          <div className="flex flex-wrap gap-1.5">
            {recentColors.map((hex) => (
              <ColorSwatch
                key={`recent-${hex}`}
                hex={hex}
                active={normalizeHexColor(value) === hex}
                disabled={disabled}
                onSelect={commitColor}
              />
            ))}
          </div>
        </div>
      ) : null}

      {helperText ? <p className="text-[11px] text-[var(--color-text-muted)]">{helperText}</p> : null}
    </div>
  )
}

interface ColorSwatchProps {
  hex: string
  active?: boolean
  disabled?: boolean
  onSelect: (hex: string) => void
}

/**
 * 색상 스와치 버튼
 * @param {ColorSwatchProps} props - 스와치 props
 * @returns {React.ReactElement}
 */
function ColorSwatch({ hex, active = false, disabled = false, onSelect }: ColorSwatchProps) {
  return (
    <button
      type="button"
      title={hex}
      disabled={disabled}
      onClick={() => onSelect(hex)}
      className={cn(
        'size-6 rounded border transition-transform hover:scale-105 disabled:opacity-50',
        active ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]' : 'border-[var(--color-border)]',
      )}
      style={{ backgroundColor: hex }}
    />
  )
}
