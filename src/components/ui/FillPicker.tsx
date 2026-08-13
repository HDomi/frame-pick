'use client'

import { ColorPicker } from '@/components/ui/ColorPicker'
import { FormField } from '@/components/ui/FormField'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  createDefaultGradientFill,
  createSolidFill,
  fillColorToPickerHex,
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
 * 투명도 슬라이더
 * @param {{ label: string; value: number; disabled?: boolean; onChange: (v: number) => void }} props
 * @returns {React.ReactElement}
 */
function OpacitySlider({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}) {
  const pct = Math.round(value * 100)
  return (
    <FormField label={`${label} (${pct}%)`}>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        value={pct}
        className={cn('w-full', disabled && 'opacity-70')}
        onChange={(event) => {
          onChange(Number(event.target.value) / 100)
        }}
      />
    </FormField>
  )
}

/**
 * 단색 / 선형 그라데이션 채움 피커 (+ 투명도)
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
      if (value.mode === 'gradient') {
        onChange(createSolidFill(value.colorA, value.opacityA))
      }
      return
    }
    if (value.mode === 'solid') {
      onChange(createDefaultGradientFill(value.color, '#3b82f6', value.opacity, 1))
    }
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
              ? createSolidFill(value.colorA, value.opacityA)
              : value,
          ),
        }}
        aria-hidden
      />

      {mode === 'solid' || !allowGradient ? (
        <div className="flex flex-col gap-2">
          <ColorPicker
            label="색상"
            value={
              value.mode === 'solid'
                ? fillColorToPickerHex(value.color, value.opacity)
                : fillColorToPickerHex(value.colorA, value.opacityA)
            }
            recentColors={recentColors}
            disabled={disabled}
            onChange={(hex) => {
              onChange(createSolidFill(hex))
            }}
          />
          <OpacitySlider
            label="투명도"
            value={value.mode === 'solid' ? value.opacity : value.opacityA}
            disabled={disabled}
            onChange={(opacity) => {
              const color = value.mode === 'solid' ? value.color : value.colorA
              onChange(createSolidFill(color, opacity))
            }}
          />
        </div>
      ) : value.mode === 'gradient' ? (
        <div className="flex flex-col gap-2">
          <FormField label="방향">
            <SegmentedControl
              value={value.direction}
              disabled={disabled}
              options={DIRECTION_OPTIONS}
              onChange={(direction) => {
                onChange({ ...value, direction })
              }}
            />
          </FormField>
          <ColorPicker
            label="시작 색"
            value={fillColorToPickerHex(value.colorA, value.opacityA)}
            recentColors={recentColors}
            disabled={disabled}
            onChange={(hex) => {
              const solid = createSolidFill(hex)
              onChange({ ...value, colorA: solid.color, opacityA: solid.opacity })
            }}
          />
          <OpacitySlider
            label="시작 투명도"
            value={value.opacityA}
            disabled={disabled}
            onChange={(opacityA) => {
              onChange({ ...value, opacityA })
            }}
          />
          <ColorPicker
            label="끝 색"
            value={fillColorToPickerHex(value.colorB, value.opacityB)}
            recentColors={recentColors}
            disabled={disabled}
            onChange={(hex) => {
              const solid = createSolidFill(hex)
              onChange({ ...value, colorB: solid.color, opacityB: solid.opacity })
            }}
          />
          <OpacitySlider
            label="끝 투명도"
            value={value.opacityB}
            disabled={disabled}
            onChange={(opacityB) => {
              onChange({ ...value, opacityB })
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
