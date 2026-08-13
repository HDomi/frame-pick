'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
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
 * 컴팩트 트리거 + 팝오버(피커·프리셋·최근색)
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
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const current = normalizeHexColor(value) ?? '#ffffff'

  useEffect(() => {
    setHexInput(current)
  }, [current])

  useEffect(() => {
    if (!open) {
      return
    }

    /**
     * @param {MouseEvent} event
     * @returns {void}
     */
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target || !rootRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

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
    <div ref={rootRef} className="relative flex flex-col gap-1">
      <FormField label={label}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${label} 선택`}
            title="색상 선택"
            className={cn(
              'size-9 shrink-0 rounded-md border border-[var(--color-border)] shadow-inner transition-transform hover:scale-[1.02] disabled:opacity-50',
              open && 'ring-2 ring-[var(--color-accent)]',
            )}
            style={{ backgroundColor: current }}
            onClick={() => {
              if (!disabled) {
                setOpen((prev) => !prev)
              }
            }}
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

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} 피커`}
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1 flex flex-col gap-3',
            'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl',
          )}
        >
          <div className="color-picker-popover [&_.react-colorful]:h-[140px] [&_.react-colorful]:w-full">
            <HexColorPicker color={current} onChange={commitColor} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">프리셋</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((hex) => (
                <ColorSwatch
                  key={hex}
                  hex={hex}
                  active={current === hex}
                  disabled={disabled}
                  onSelect={commitColor}
                />
              ))}
            </div>
          </div>

          {recentColors.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--color-text-muted)]">최근 색상</span>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((hex) => (
                  <ColorSwatch
                    key={`recent-${hex}`}
                    hex={hex}
                    active={current === hex}
                    disabled={disabled}
                    onSelect={commitColor}
                  />
                ))}
              </div>
            </div>
          ) : null}
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
        active
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
          : 'border-[var(--color-border)]',
      )}
      style={{ backgroundColor: hex }}
    />
  )
}
