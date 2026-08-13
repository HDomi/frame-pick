import type { CanvasSize } from '@/lib/canvas-size'

/** 내보내기 파일 포맷 */
export type ExportFormat = 'png' | 'jpeg' | 'webp'

/** 압축 품질 3단계 (JPEG/WebP) */
export type ExportQualityLevel = 'low' | 'medium' | 'high'

/** 내보내기 해상도 프리셋 ID */
export type ExportResolutionId =
  | 'artboard'
  | 'hd_720'
  | 'fhd_1080'
  | 'qhd_1440'
  | 'uhd_2160'

export interface ExportResolutionPreset {
  id: ExportResolutionId
  label: string
  /** artboard면 null — 현재 아트보드 크기 사용 */
  width: number | null
  height: number | null
  description: string
}

export interface ExportOptions {
  format: ExportFormat
  quality: ExportQualityLevel
  resolutionId: ExportResolutionId
}

/** 기본 내보내기 옵션 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  quality: 'high',
  resolutionId: 'artboard',
}

/** 내보내기 해상도 목록 (16:9) */
export const EXPORT_RESOLUTION_PRESETS: readonly ExportResolutionPreset[] = [
  {
    id: 'artboard',
    label: '아트보드',
    width: null,
    height: null,
    description: '편집 중인 아트보드 크기 그대로',
  },
  {
    id: 'hd_720',
    label: '1280×720',
    width: 1280,
    height: 720,
    description: 'HD / 유튜브 썸네일',
  },
  {
    id: 'fhd_1080',
    label: '1920×1080',
    width: 1920,
    height: 1080,
    description: 'Full HD (기본 아트보드)',
  },
  {
    id: 'qhd_1440',
    label: '2560×1440',
    width: 2560,
    height: 1440,
    description: 'QHD (업스케일)',
  },
  {
    id: 'uhd_2160',
    label: '3840×2160',
    width: 3840,
    height: 2160,
    description: '4K (업스케일)',
  },
] as const

const QUALITY_VALUE: Record<ExportQualityLevel, number> = {
  low: 0.62,
  medium: 0.82,
  high: 0.95,
}

const FORMAT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const FORMAT_EXT: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/**
 * 품질 단계를 toDataURL quality(0~1)로 변환한다.
 * @param {ExportQualityLevel} level
 * @returns {number}
 */
export function getExportQualityValue(level: ExportQualityLevel): number {
  return QUALITY_VALUE[level]
}

/**
 * 포맷 MIME 타입
 * @param {ExportFormat} format
 * @returns {string}
 */
export function getExportMimeType(format: ExportFormat): string {
  return FORMAT_MIME[format]
}

/**
 * 포맷 확장자
 * @param {ExportFormat} format
 * @returns {string}
 */
export function getExportExtension(format: ExportFormat): string {
  return FORMAT_EXT[format]
}

/**
 * PNG는 무손실이라 품질 슬라이더가 의미 없는지
 * @param {ExportFormat} format
 * @returns {boolean}
 */
export function isLossyExportFormat(format: ExportFormat): boolean {
  return format === 'jpeg' || format === 'webp'
}

/**
 * 내보내기 목표 픽셀 크기를 구한다.
 * @param {CanvasSize} artboard - 현재 아트보드
 * @param {ExportResolutionId} resolutionId
 * @returns {{ width: number; height: number }}
 */
export function resolveExportPixelSize(
  artboard: Pick<CanvasSize, 'width' | 'height'>,
  resolutionId: ExportResolutionId,
): { width: number; height: number } {
  const preset = EXPORT_RESOLUTION_PRESETS.find((item) => item.id === resolutionId)
  if (!preset || preset.width == null || preset.height == null) {
    return { width: artboard.width, height: artboard.height }
  }
  return { width: preset.width, height: preset.height }
}

/**
 * Fabric multiplier = 목표너비 / 아트보드너비
 * @param {CanvasSize} artboard
 * @param {ExportResolutionId} resolutionId
 * @returns {number}
 */
export function getExportMultiplier(
  artboard: Pick<CanvasSize, 'width' | 'height'>,
  resolutionId: ExportResolutionId,
): number {
  const target = resolveExportPixelSize(artboard, resolutionId)
  return target.width / artboard.width
}
