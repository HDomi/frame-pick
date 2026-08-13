import { BASE_PATH } from '@/lib/constants'

/** 누끼 입력 파일 상한 (bytes) */
export const CUTOUT_MAX_FILE_BYTES = 15 * 1024 * 1024

/** 누끼 입력 긴 변 상한 (px) — 초과 시 리사이즈 */
export const CUTOUT_MAX_EDGE = 1920

/** 누끼 경고 긴 변 (px) */
export const CUTOUT_WARN_EDGE = 2560

/** 누끼 추론 타임아웃 (ms) */
export const CUTOUT_TIMEOUT_MS = 90_000

/** rembg 모델 파일 public 경로 (basePath 포함) */
export const CUTOUT_MODEL_BASE_URL = `${BASE_PATH}/models`

/** onnxruntime wasm CDN */
export const ONNX_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/'

/** 저사양에서 쓰는 경량 모델 */
export const CUTOUT_LIGHT_MODEL = 'u2netp' as const

/** 일반 기기 기본 모델 (동일 경량 — self-host 1종) */
export const CUTOUT_DEFAULT_MODEL = 'u2netp' as const
