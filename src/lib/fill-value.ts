import { Gradient } from 'fabric'
import { normalizeHexColor } from '@/lib/color-repository'

/** 채움 모드 */
export type FillMode = 'solid' | 'gradient'

/** 선형 그라데이션 방향 */
export type GradientDirection = 'horizontal' | 'vertical' | 'diagonal'

export interface SolidFillValue {
  mode: 'solid'
  color: string
}

export interface GradientFillValue {
  mode: 'gradient'
  colorA: string
  colorB: string
  direction: GradientDirection
}

export type FillValue = SolidFillValue | GradientFillValue

const DIRECTION_COORDS: Record<
  GradientDirection,
  { x1: number; y1: number; x2: number; y2: number }
> = {
  horizontal: { x1: 0, y1: 0, x2: 1, y2: 0 },
  vertical: { x1: 0, y1: 0, x2: 0, y2: 1 },
  diagonal: { x1: 0, y1: 0, x2: 1, y2: 1 },
}

/**
 * 단색 FillValue를 만든다.
 * @param {string} color - hex
 * @returns {SolidFillValue}
 */
export function createSolidFill(color: string): SolidFillValue {
  return {
    mode: 'solid',
    color: normalizeHexColor(color) ?? '#ffffff',
  }
}

/**
 * 기본 그라데이션 FillValue
 * @param {string} [colorA='#ffffff']
 * @param {string} [colorB='#3b82f6']
 * @returns {GradientFillValue}
 */
export function createDefaultGradientFill(
  colorA = '#ffffff',
  colorB = '#3b82f6',
): GradientFillValue {
  return {
    mode: 'gradient',
    colorA: normalizeHexColor(colorA) ?? '#ffffff',
    colorB: normalizeHexColor(colorB) ?? '#3b82f6',
    direction: 'horizontal',
  }
}

/**
 * CSS 미리보기용 background 문자열
 * @param {FillValue} value
 * @returns {string}
 */
export function fillValueToCssBackground(value: FillValue): string {
  if (value.mode === 'solid') {
    return value.color
  }
  const angle =
    value.direction === 'vertical'
      ? '180deg'
      : value.direction === 'diagonal'
        ? '135deg'
        : '90deg'
  return `linear-gradient(${angle}, ${value.colorA}, ${value.colorB})`
}

/**
 * Fabric fill에서 UI용 FillValue를 추출한다.
 * @param {unknown} fill
 * @param {string} [fallback='#ffffff']
 * @returns {FillValue}
 */
export function parseFabricFill(fill: unknown, fallback = '#ffffff'): FillValue {
  if (typeof fill === 'string') {
    return createSolidFill(normalizeHexColor(fill) ?? fallback)
  }

  if (fill instanceof Gradient) {
    const stops = [...(fill.colorStops ?? [])].sort((a, b) => a.offset - b.offset)
    const colorA =
      normalizeHexColor(String(stops[0]?.color ?? fallback)) ?? fallback
    const colorB =
      normalizeHexColor(String(stops[stops.length - 1]?.color ?? colorA)) ?? colorA
    const coords = fill.coords as { x1?: number; y1?: number; x2?: number; y2?: number }
    const dx = Math.abs((coords.x2 ?? 0) - (coords.x1 ?? 0))
    const dy = Math.abs((coords.y2 ?? 0) - (coords.y1 ?? 0))
    let direction: GradientDirection = 'horizontal'
    if (dx < 0.01 && dy > 0.01) {
      direction = 'vertical'
    } else if (dx > 0.01 && dy > 0.01) {
      direction = 'diagonal'
    }
    return {
      mode: 'gradient',
      colorA,
      colorB,
      direction,
    }
  }

  // JSON 복원 직후 plain object인 경우
  if (fill && typeof fill === 'object' && 'colorStops' in fill) {
    const raw = fill as {
      type?: string
      coords?: { x1?: number; y1?: number; x2?: number; y2?: number }
      colorStops?: { offset: number; color: string }[]
    }
    const stops = [...(raw.colorStops ?? [])].sort((a, b) => a.offset - b.offset)
    const colorA =
      normalizeHexColor(String(stops[0]?.color ?? fallback)) ?? fallback
    const colorB =
      normalizeHexColor(String(stops[stops.length - 1]?.color ?? colorA)) ?? colorA
    const coords = raw.coords ?? {}
    const dx = Math.abs((coords.x2 ?? 0) - (coords.x1 ?? 0))
    const dy = Math.abs((coords.y2 ?? 0) - (coords.y1 ?? 0))
    let direction: GradientDirection = 'horizontal'
    if (dx < 0.01 && dy > 0.01) {
      direction = 'vertical'
    } else if (dx > 0.01 && dy > 0.01) {
      direction = 'diagonal'
    }
    return { mode: 'gradient', colorA, colorB, direction }
  }

  return createSolidFill(fallback)
}

/**
 * FillValue를 Fabric fill(string | Gradient)로 만든다.
 * @param {FillValue} value
 * @returns {string | Gradient}
 */
export function createFabricFill(value: FillValue): string | Gradient<'linear'> {
  if (value.mode === 'solid') {
    return normalizeHexColor(value.color) ?? '#ffffff'
  }

  const colorA = normalizeHexColor(value.colorA) ?? '#ffffff'
  const colorB = normalizeHexColor(value.colorB) ?? '#3b82f6'
  const coords = DIRECTION_COORDS[value.direction]

  return new Gradient({
    type: 'linear',
    gradientUnits: 'percentage',
    coords,
    colorStops: [
      { offset: 0, color: colorA },
      { offset: 1, color: colorB },
    ],
  })
}

/**
 * fill이 그라데이션인지
 * @param {unknown} fill
 * @returns {boolean}
 */
export function isGradientFill(fill: unknown): boolean {
  return fill instanceof Gradient || parseFabricFill(fill).mode === 'gradient'
}
