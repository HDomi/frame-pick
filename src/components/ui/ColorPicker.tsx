'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { HexAlphaColorPicker } from 'react-colorful'
import { FormField } from '@/components/ui/FormField'
import {
  formatHexColor,
  hexToCssColor,
  normalizeHexColor,
  parseHexColor,
} from '@/lib/color-repository'
import { PRESET_COLORS } from '@/lib/ui-constants'
import { cn } from '@/lib/cn'

/** 투명 프리셋 (8자리) */
const TRANSPARENT_HEX = '#00000000'

interface ColorPickerProps {
  value: string
  recentColors?: string[]
  label?: string
  disabled?: boolean
  helperText?: string
  /** false면 알파 UI·8자리 입력 숨김 (기본 true) */
  allowAlpha?: boolean
  onChange: (hex: string) => void
}

/**
 * 컴팩트 트리거 + 팝오버(알파 피커·프리셋·최근색). #RRGGBB / #RRGGBBAA 지원.
 * @param {ColorPickerProps} props - 피커 props
 * @returns {React.ReactElement}
 */
export function ColorPicker({
  value,
  recentColors = [],
  label = '색상',
  disabled = false,
  helperText,
  allowAlpha = true,
  onChange,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const parsed = parseHexColor(value)
  const current = parsed?.hex ?? '#ffffff'
  const pickerColor = formatHexColor(parsed?.rgb ?? '#ffffff', parsed?.alpha ?? 1, {
    forceAlpha: true,
  })

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
    const nextValue = allowAlpha
      ? normalized
      : (parseHexColor(normalized)?.rgb ?? normalized)
    setHexInput(nextValue)
    onChange(nextValue)
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
              'bg-[length:10px_10px]',
              open && 'ring-2 ring-[var(--color-accent)]',
            )}
            style={{
              backgroundImage:
                'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
              backgroundColor: 'transparent',
            }}
            onClick={() => {
              if (!disabled) {
                setOpen((prev) => !prev)
              }
            }}
          >
            <span
              className="block size-full rounded-[5px]"
              style={{ backgroundColor: hexToCssColor(current) }}
            />
          </button>
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
            placeholder={allowAlpha ? '#rrggbbaa' : '#rrggbb'}
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
          <div className="color-picker-popover [&_.react-colorful]:h-[160px] [&_.react-colorful]:w-full">
            <HexAlphaColorPicker color={pickerColor} onChange={commitColor} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--color-text-muted)]">프리셋</span>
            <div className="flex flex-wrap gap-1.5">
              {allowAlpha ? (
                <ColorSwatch
                  hex={TRANSPARENT_HEX}
                  label="투명"
                  active={current === TRANSPARENT_HEX || (parsed?.alpha ?? 1) === 0}
                  disabled={disabled}
                  onSelect={commitColor}
                />
              ) : null}
              {PRESET_COLORS.map((hex) => (
                <ColorSwatch
                  key={hex}
                  hex={hex}
                  active={parsed?.rgb === hex && (parsed?.alpha ?? 1) === 1}
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
                    active={current === normalizeHexColor(hex)}
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
  label?: string
  active?: boolean
  disabled?: boolean
  onSelect: (hex: string) => void
}

/**
 * 색상 스와치 버튼 (투명 체커보드 배경)
 * @param {ColorSwatchProps} props - 스와치 props
 * @returns {React.ReactElement}
 */
function ColorSwatch({
  hex,
  label,
  active = false,
  disabled = false,
  onSelect,
}: ColorSwatchProps) {
  return (
    <button
      type="button"
      title={label ?? hex}
      disabled={disabled}
      onClick={() => onSelect(hex)}
      className={cn(
        'size-6 overflow-hidden rounded border transition-transform hover:scale-105 disabled:opacity-50',
        active
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
          : 'border-[var(--color-border)]',
      )}
      style={{
        backgroundImage:
          'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
      }}
    >
      <span className="block size-full" style={{ backgroundColor: hexToCssColor(hex) }} />
    </button>
  )
}
