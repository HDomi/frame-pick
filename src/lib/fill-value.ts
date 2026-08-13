import { Gradient } from 'fabric'
import {
  clampAlpha,
  formatHexColor,
  normalizeHexColor,
  parseHexColor,
} from '@/lib/color-repository'

/** 채움 모드 */
export type FillMode = 'solid' | 'gradient'

/** 선형 그라데이션 방향 */
export type GradientDirection = 'horizontal' | 'vertical' | 'diagonal'

export interface SolidFillValue {
  mode: 'solid'
  color: string
  /** 0~1 */
  opacity: number
}

export interface GradientFillValue {
  mode: 'gradient'
  colorA: string
  colorB: string
  /** 0~1 */
  opacityA: number
  /** 0~1 */
  opacityB: number
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
 * 0~1 투명도를 클램프한다.
 * @param {number} value
 * @returns {number}
 */
export function clampOpacity(value: number): number {
  return clampAlpha(value)
}

/**
 * hex(+선택 alpha) + opacity → rgba()
 * @param {string} hex
 * @param {number} [opacity] - 없으면 hex 알파 사용
 * @returns {string}
 */
export function hexToRgba(hex: string, opacity?: number): string {
  const parsed = parseHexColor(hex)
  const rgb = parsed?.rgb ?? '#ffffff'
  const a = opacity != null ? clampOpacity(opacity) : (parsed?.alpha ?? 1)
  const r = Number.parseInt(rgb.slice(1, 3), 16)
  const g = Number.parseInt(rgb.slice(3, 5), 16)
  const b = Number.parseInt(rgb.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/**
 * rgba/hex 문자열에서 불투명도를 읽는다.
 * @param {string} color
 * @returns {number}
 */
export function readColorOpacity(color: string): number {
  const parsed = parseHexColor(color)
  if (parsed) {
    return parsed.alpha
  }
  return 1
}

/**
 * 색 문자열에서 #RRGGBB만 추출한다.
 * @param {string} color
 * @param {string} [fallback='#ffffff']
 * @returns {string}
 */
export function colorToHex(color: string, fallback = '#ffffff'): string {
  const parsed = parseHexColor(color)
  if (parsed) {
    return parsed.rgb
  }
  return fallback
}

/**
 * FillValue용 표시 hex (#RRGGBB 또는 #RRGGBBAA)
 * @param {string} color
 * @param {number} opacity
 * @returns {string}
 */
export function fillColorToPickerHex(color: string, opacity: number): string {
  return formatHexColor(colorToHex(color), opacity)
}

/**
 * 단색 FillValue — 8자리 hex면 알파를 opacity에 반영
 * @param {string} color
 * @param {number} [opacity] - 생략 시 hex 알파 또는 1
 * @returns {SolidFillValue}
 */
export function createSolidFill(color: string, opacity?: number): SolidFillValue {
  const parsed = parseHexColor(color)
  const rgb = parsed?.rgb ?? colorToHex(color)
  const nextOpacity = opacity != null ? clampOpacity(opacity) : (parsed?.alpha ?? 1)
  return {
    mode: 'solid',
    color: normalizeHexColor(rgb) ?? rgb,
    opacity: nextOpacity,
  }
}

/**
 * 기본 그라데이션 FillValue
 * @param {string} [colorA='#ffffff']
 * @param {string} [colorB='#3b82f6']
 * @param {number} [opacityA=1]
 * @param {number} [opacityB=1]
 * @returns {GradientFillValue}
 */
export function createDefaultGradientFill(
  colorA = '#ffffff',
  colorB = '#3b82f6',
  opacityA?: number,
  opacityB?: number,
): GradientFillValue {
  const parsedA = parseHexColor(colorA)
  const parsedB = parseHexColor(colorB)
  return {
    mode: 'gradient',
    colorA: parsedA?.rgb ?? '#ffffff',
    colorB: parsedB?.rgb ?? '#3b82f6',
    opacityA: opacityA != null ? clampOpacity(opacityA) : (parsedA?.alpha ?? 1),
    opacityB: opacityB != null ? clampOpacity(opacityB) : (parsedB?.alpha ?? 1),
    direction: 'horizontal',
  }
}

/**
 * CSS 미리보기용 background
 * @param {FillValue} value
 * @returns {string}
 */
export function fillValueToCssBackground(value: FillValue): string {
  if (value.mode === 'solid') {
    return hexToRgba(value.color, value.opacity)
  }
  const angle =
    value.direction === 'vertical'
      ? '180deg'
      : value.direction === 'diagonal'
        ? '135deg'
        : '90deg'
  return `linear-gradient(${angle}, ${hexToRgba(value.colorA, value.opacityA)}, ${hexToRgba(value.colorB, value.opacityB)})`
}

/**
 * Fabric fill → FillValue
 * @param {unknown} fill
 * @param {string} [fallback='#ffffff']
 * @returns {FillValue}
 */
export function parseFabricFill(fill: unknown, fallback = '#ffffff'): FillValue {
  if (fill == null || fill === '' || fill === 'transparent') {
    return createSolidFill('#000000', 0)
  }

  if (typeof fill === 'string') {
    return createSolidFill(colorToHex(fill, fallback), readColorOpacity(fill))
  }

  const fromStops = (
    stopsRaw: { offset: number; color: string }[],
    coords: { x1?: number; y1?: number; x2?: number; y2?: number },
  ): GradientFillValue => {
    const stops = [...stopsRaw].sort((a, b) => a.offset - b.offset)
    const first = stops[0]
    const last = stops[stops.length - 1]
    const colorA = colorToHex(String(first?.color ?? fallback), fallback)
    const colorB = colorToHex(String(last?.color ?? colorA), colorA)
    const opacityA = readColorOpacity(String(first?.color ?? 'rgba(0,0,0,1)'))
    const opacityB = readColorOpacity(String(last?.color ?? 'rgba(0,0,0,1)'))
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
      opacityA,
      opacityB,
      direction,
    }
  }

  if (fill instanceof Gradient) {
    return fromStops(
      (fill.colorStops ?? []).map((stop) => ({
        offset: stop.offset,
        color: String(stop.color),
      })),
      fill.coords as { x1?: number; y1?: number; x2?: number; y2?: number },
    )
  }

  if (fill && typeof fill === 'object' && 'colorStops' in fill) {
    const raw = fill as {
      coords?: { x1?: number; y1?: number; x2?: number; y2?: number }
      colorStops?: { offset: number; color: string }[]
    }
    return fromStops(raw.colorStops ?? [], raw.coords ?? {})
  }

  return createSolidFill(fallback)
}

/**
 * FillValue → Fabric fill
 * @param {FillValue} value
 * @returns {string | Gradient<'linear'>}
 */
export function createFabricFill(value: FillValue): string | Gradient<'linear'> {
  if (value.mode === 'solid') {
    return hexToRgba(value.color, value.opacity)
  }

  const coords = DIRECTION_COORDS[value.direction]
  return new Gradient({
    type: 'linear',
    gradientUnits: 'percentage',
    coords,
    colorStops: [
      { offset: 0, color: hexToRgba(value.colorA, value.opacityA) },
      { offset: 1, color: hexToRgba(value.colorB, value.opacityB) },
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
