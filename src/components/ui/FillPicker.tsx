'use client'

import { ColorPicker } from '@/components/ui/ColorPicker'
import { FormField } from '@/components/ui/FormField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  createDefaultGradientFill,
  createSolidFill,
  fillValueToCssBackground,
  type FillMode,
  type FillValue,
  type GradientDirection,
} from '@/lib/fill-value'
import { cn } from '@/lib/cn'

interface FillPickerProps {
  value: FillValue
  label?: string
  recentColors?: string[]
  disabled?: boolean
  /** false면 단색만 (부분 글자 선택 등) */
  allowGradient?: boolean
  helperText?: string
  onChange: (value: FillValue) => void
}

const MODE_OPTIONS: { value: FillMode; label: string }[] = [
  { value: 'solid', label: '단색' },
  { value: 'gradient', label: '그라데이션' },
]

const DIRECTION_OPTIONS: { value: GradientDirection; label: string }[] = [
  { value: 'horizontal', label: '가로' },
  { value: 'vertical', label: '세로' },
  { value: 'diagonal', label: '대각' },
]

/**
 * 단색 / 선형 그라데이션 채움 피커
 * @param {FillPickerProps} props
 * @returns {React.ReactElement}
 */
export function FillPicker({
  value,
  label = '채움',
  recentColors = [],
  disabled = false,
  allowGradient = true,
  helperText,
  onChange,
}: FillPickerProps) {
  const mode: FillMode = allowGradient ? value.mode : 'solid'

  /**
   * 모드 전환
   * @param {FillMode} nextMode
   * @returns {void}
   */
  const handleModeChange = (nextMode: FillMode) => {
    if (nextMode === value.mode) {
      return
    }
    if (nextMode === 'solid') {
      const color = value.mode === 'gradient' ? value.colorA : value.color
      onChange(createSolidFill(color))
      return
    }
    const base = value.mode === 'solid' ? value.color : value.colorA
    onChange(createDefaultGradientFill(base, value.mode === 'gradient' ? value.colorB : '#3b82f6'))
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label={label}>
        {allowGradient ? (
          <SegmentedControl
            value={mode}
            disabled={disabled}
            options={MODE_OPTIONS}
            onChange={handleModeChange}
          />
        ) : null}
      </FormField>

      <div
        className="h-8 w-full rounded-md border border-[var(--color-border)]"
        style={{
          background: fillValueToCssBackground(
            !allowGradient && value.mode === 'gradient'
              ? createSolidFill(value.colorA)
              : value,
          ),
        }}
        aria-hidden
      />

      {mode === 'solid' || !allowGradient ? (
        <ColorPicker
          label="색상"
          value={value.mode === 'solid' ? value.color : value.colorA}
          recentColors={recentColors}
          disabled={disabled}
          onChange={(hex) => {
            onChange(createSolidFill(hex))
          }}
        />
      ) : value.mode === 'gradient' ? (
        <div className="flex flex-col gap-2">
          <FormField label="방향">
            <SegmentedControl
              value={value.mode === 'gradient' ? value.direction : 'horizontal'}
              disabled={disabled}
              options={DIRECTION_OPTIONS}
              onChange={(direction) => {
                if (value.mode !== 'gradient') {
                  return
                }
                onChange({ ...value, direction })
              }}
            />
          </FormField>
          <ColorPicker
            label="시작 색"
            value={value.colorA}
            recentColors={recentColors}
            disabled={disabled}
            onChange={(hex) => {
              onChange({
                mode: 'gradient',
                colorA: hex,
                colorB: value.colorB,
                direction: value.direction,
              })
            }}
          />
          <ColorPicker
            label="끝 색"
            value={value.colorB}
            recentColors={recentColors}
            disabled={disabled}
            onChange={(hex) => {
              onChange({
                mode: 'gradient',
                colorA: value.colorA,
                colorB: hex,
                direction: value.direction,
              })
            }}
          />
        </div>
      ) : null}

      {!allowGradient ? (
        <p className={cn('text-[11px] text-[var(--color-text-muted)]')}>
          선택한 글자에는 단색만 적용됩니다.
        </p>
      ) : null}
      {helperText ? <p className="text-[11px] text-[var(--color-text-muted)]">{helperText}</p> : null}
    </div>
  )
}
