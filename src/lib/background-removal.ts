import {
  CUTOUT_DEFAULT_MODEL,
  CUTOUT_LIGHT_MODEL,
  CUTOUT_MODEL_BASE_URL,
  CUTOUT_TIMEOUT_MS,
  ONNX_WASM_CDN,
} from '@/lib/cutout-constants'

export type CutoutProgress = {
  step: string
  progress: number
  message: string
}

export type RemoveBackgroundOptions = {
  preferLightModel?: boolean
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
 * WASM 기반 배경 제거를 동적 로드 후 실행한다.
 * @param {Blob | File} imageSource - 원본 이미지
 * @param {RemoveBackgroundOptions} [options] - 옵션
 * @returns {Promise<Blob>} - 투명 PNG Blob
 */
export async function removeBackground(
  imageSource: Blob | File,
  options: RemoveBackgroundOptions = {},
): Promise<Blob> {
  const rembg = await loadRembg()
  const modelName = options.preferLightModel ? CUTOUT_LIGHT_MODEL : CUTOUT_DEFAULT_MODEL
  const session = await rembg.newSession(modelName)

  const result = await withTimeout(
    rembg.remove(imageSource, {
      session,
      postProcessMask: true,
      onProgress: (info) => {
        options.onProgress?.({
          step: info.step,
          progress: info.progress,
          message: info.message,
        })
      },
    }),
    CUTOUT_TIMEOUT_MS,
    options.signal,
  )

  return result
}
