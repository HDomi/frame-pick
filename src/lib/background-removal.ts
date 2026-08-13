import {
  CUTOUT_LIGHT_MODEL,
  CUTOUT_MODEL_BASE_URL,
  CUTOUT_QUALITY_MODEL,
  CUTOUT_TIMEOUT_MS,
  ONNX_WASM_CDN,
  type CutoutQuality,
} from '@/lib/cutout-constants'
import { cleanupCutoutFringe } from '@/lib/cutout-alpha-cleanup'
import {
  punchHolesFromSourceBackground,
  removeSolidBackground,
} from '@/lib/cutout-solid-bg'

export type CutoutProgress = {
  step: string
  progress: number
  message: string
}

export type RemoveBackgroundOptions = {
  /** @deprecated quality 사용 */
  preferLightModel?: boolean
  quality?: CutoutQuality
  signal?: AbortSignal
  onProgress?: (info: CutoutProgress) => void
}

let configured = false

/**
 * rembg/onnx 경로를 한 번만 설정한다.
 * @returns {Promise<typeof import('@bunnio/rembg-web')>}
 */
async function loadRembg() {
  const rembg = await import('@bunnio/rembg-web')
  if (!configured) {
    rembg.rembgConfig.setBaseUrl(CUTOUT_MODEL_BASE_URL)
    rembg.rembgConfig.setCustomModelPath(
      'u2netp',
      `${CUTOUT_MODEL_BASE_URL}/u2netp.onnx`,
    )
    rembg.rembgConfig.setCustomModelPath(
      'silueta',
      `${CUTOUT_MODEL_BASE_URL}/silueta.onnx`,
    )

    try {
      const ort = await import('onnxruntime-web')
      ort.env.wasm.wasmPaths = ONNX_WASM_CDN
    } catch {
      // rembg가 ort를 묶은 경우 무시
    }
    configured = true
  }
  return rembg
}

/**
 * 고품질 모델 파일이 배포돼 있는지 확인한다.
 * @returns {Promise<boolean>}
 */
export async function isQualityModelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${CUTOUT_MODEL_BASE_URL}/silueta.onnx`, {
      method: 'HEAD',
      cache: 'no-cache',
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Promise에 타임아웃·취소를 건다.
 * @template T
 * @param {Promise<T>} promise - 원본
 * @param {number} timeoutMs - 타임아웃
 * @param {AbortSignal} [signal] - 취소
 * @returns {Promise<T>}
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = window.setTimeout(() => {
      reject(new Error('누끼 처리 시간이 초과되었습니다.'))
    }, timeoutMs)

    /**
     * @returns {void}
     */
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })

    promise
      .then((value) => {
        window.clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        resolve(value)
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        reject(error)
      })
  })
}

/**
 * 품질 옵션에 따른 모델명을 고른다.
 * @param {CutoutQuality} quality
 * @returns {string}
 */
function resolveModelName(quality: CutoutQuality): string {
  if (quality === 'fast') {
    return CUTOUT_LIGHT_MODEL
  }
  return CUTOUT_QUALITY_MODEL
}

/**
 * WASM 기반 배경 제거를 동적 로드 후 실행한다.
 * @param {Blob | File} imageSource - 원본 이미지
 * @param {RemoveBackgroundOptions} [options] - 옵션
 * @returns {Promise<Blob>} - 투명 PNG Blob
 */
export async function removeBackground(
  imageSource: Blob | File,
  options: RemoveBackgroundOptions = {},
): Promise<Blob> {
  const quality: CutoutQuality =
    options.quality ??
    (options.preferLightModel ? 'fast' : 'quality')

  options.onProgress?.({
    step: 'processing',
    progress: 5,
    message: quality === 'solid' ? '단색 배경 분석 중…' : '모델 준비 중…',
  })

  if (quality === 'solid') {
    options.onProgress?.({
      step: 'processing',
      progress: 40,
      message: '단색 배경 제거 중…',
    })
    const solid = await removeSolidBackground(imageSource)
    options.onProgress?.({
      step: 'complete',
      progress: 100,
      message: '완료',
    })
    return solid
  }

  const rembg = await loadRembg()
  let modelName = resolveModelName(quality)

  if (modelName === CUTOUT_QUALITY_MODEL) {
    const available = await isQualityModelAvailable()
    if (!available) {
      options.onProgress?.({
        step: 'processing',
        progress: 8,
        message: '고품질 모델 없음 → 경량 모델로 진행…',
      })
      modelName = CUTOUT_LIGHT_MODEL
    }
  }

  const session = await rembg.newSession(modelName)

  const result = await withTimeout(
    rembg.remove(imageSource, {
      session,
      postProcessMask: true,
      onProgress: (info) => {
        options.onProgress?.({
          step: info.step,
          progress: Math.min(90, Math.round(info.progress * 0.9)),
          message: info.message,
        })
      },
    }),
    CUTOUT_TIMEOUT_MS,
    options.signal,
  )

  options.onProgress?.({
    step: 'postprocessing',
    progress: 92,
    message: '안쪽 구멍·가장자리 정리 중…',
  })
  // AI 마스크가 메운 로고 구멍(단색 배경)을 원본 색으로 추가 천공
  const punched = await punchHolesFromSourceBackground(imageSource, result)
  const cleaned = await cleanupCutoutFringe(punched)
  options.onProgress?.({
    step: 'complete',
    progress: 100,
    message: '완료',
  })
  return cleaned
}
