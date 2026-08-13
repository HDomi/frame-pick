/**
 * 캔버스 해상도 프리셋 ID
 */
export type CanvasSizeId = 'hd_720' | 'fhd_1080'

/**
 * 캔버스 논리 해상도
 */
export interface CanvasSize {
  id: CanvasSizeId
  label: string
  width: number
  height: number
  description: string
}

/** 지원 해상도 목록 (16:9) */
export const CANVAS_SIZE_PRESETS: readonly CanvasSize[] = [
  {
    id: 'fhd_1080',
    label: '1920×1080',
    width: 1920,
    height: 1080,
    description: 'Full HD',
  },
  {
    id: 'hd_720',
    label: '1280×720',
    width: 1280,
    height: 720,
    description: '유튜브 썸네일',
  },
] as const

/** 기본 해상도: Full HD */
export const DEFAULT_CANVAS_SIZE_ID: CanvasSizeId = 'fhd_1080'

/**
 * 프리셋 ID로 해상도 정보를 찾는다.
 * @param {CanvasSizeId} id - 프리셋 ID
 * @returns {CanvasSize} - 해상도 정보
 */
export function getCanvasSizeById(id: CanvasSizeId): CanvasSize {
  const found = CANVAS_SIZE_PRESETS.find((preset) => preset.id === id)
  return found ?? CANVAS_SIZE_PRESETS[0]
}
