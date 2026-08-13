import { BASE_PATH } from '@/lib/constants'

/** 누끼 입력 파일 상한 (bytes) */
export const CUTOUT_MAX_FILE_BYTES = 15 * 1024 * 1024

/** 누끼 입력 긴 변 상한 (px) — 초과 시 리사이즈 */
export const CUTOUT_MAX_EDGE = 1920

/** 누끼 경고 긴 변 (px) */
export const CUTOUT_WARN_EDGE = 2560

/** 누끼 추론 타임아웃 (ms) — 고품질 모델 여유 */
export const CUTOUT_TIMEOUT_MS = 180_000

/** rembg 모델 파일 public 경로 (basePath 포함) */
export const CUTOUT_MODEL_BASE_URL = `${BASE_PATH}/models`

/** onnxruntime wasm CDN */
export const ONNX_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/'

/** 누끼 품질/방식 */
export type CutoutQuality = 'fast' | 'quality' | 'solid'

/** 저사양/빠른 모델 (로컬 4.7MB) */
export const CUTOUT_LIGHT_MODEL = 'u2netp' as const

/** 고품질 모델 (~44MB, CI/로컬에서 public/models 에 배치) */
export const CUTOUT_QUALITY_MODEL = 'silueta' as const

/** @deprecated CUTOUT_QUALITY_MODEL 사용 */
export const CUTOUT_DEFAULT_MODEL = CUTOUT_QUALITY_MODEL

/** 단색 배경 제거 기본 허용 거리 (0~255 RGB) — 하드 컷 */
export const SOLID_BG_TOLERANCE = 48
