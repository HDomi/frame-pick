import type { ExtractedFrame } from '@/types/editor'
import { FRAME_EXTRACT_COUNT } from '@/lib/constants'

export interface ExtractFramesOptions {
  count?: number
  signal?: AbortSignal
  /**
   * 진행률 콜백 (0~100)
   * @param {number} progress - 진행률
   * @returns {void}
   */
  onProgress?: (progress: number) => void
}

/**
 * 추출 샘플 시각(초)을 계산한다. 중간점 균등 샘플로 시작/끝 블랙 프레임을 피한다.
 * @param {number} duration - 영상 길이(초)
 * @param {number} count - 프레임 수
 * @returns {number[]}
 */
export function buildSampleTimes(duration: number, count: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0 || count <= 0) {
    return []
  }
  const safeDuration = Math.max(duration - 0.05, duration * 0.99)
  return Array.from({ length: count }, (_, index) => {
    const ratio = (index + 0.5) / count
    return Math.min(Math.max(ratio * safeDuration, 0), safeDuration)
  })
}

/**
 * video를 지정 시각으로 시킹한다.
 * @param {HTMLVideoElement} video - video 요소
 * @param {number} timeSec - 목표 시각
 * @param {AbortSignal} [signal] - 취소 시그널
 * @returns {Promise<void>}
 */
function seekTo(video: HTMLVideoElement, timeSec: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    /**
     * 리스너 정리
     * @returns {void}
     */
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }

    /**
     * @returns {void}
     */
    const onSeeked = () => {
      cleanup()
      resolve()
    }

    /**
     * @returns {void}
     */
    const onError = () => {
      cleanup()
      reject(new Error('영상 시킹에 실패했습니다.'))
    }

    /**
     * @returns {void}
     */
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    video.currentTime = timeSec
  })
}

/**
 * 현재 프레임을 JPEG data URL로 캡처한다.
 * @param {HTMLVideoElement} video - video 요소
 * @returns {string}
 */
function captureFrameDataUrl(video: HTMLVideoElement): string {
  const width = video.videoWidth || 1
  const height = video.videoHeight || 1
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D를 사용할 수 없습니다.')
  }
  context.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * duration이 유효해질 때까지 대기한다.
 * @param {HTMLVideoElement} video - video 요소
 * @param {AbortSignal} [signal] - 취소 시그널
 * @returns {Promise<number>}
 */
function waitForDuration(video: HTMLVideoElement, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    /**
     * @returns {void}
     */
    const tryResolve = () => {
      const duration = video.duration
      if (Number.isFinite(duration) && duration > 0) {
        cleanup()
        resolve(duration)
      }
    }

    /**
     * @returns {void}
     */
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', tryResolve)
      video.removeEventListener('durationchange', tryResolve)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
    }

    /**
     * @returns {void}
     */
    const onError = () => {
      cleanup()
      reject(
        new Error(
          '영상을 읽을 수 없습니다. Chrome에서 MP4(H.264) 사용을 권장합니다.',
        ),
      )
    }

    /**
     * @returns {void}
     */
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    video.addEventListener('loadedmetadata', tryResolve)
    video.addEventListener('durationchange', tryResolve)
    video.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    tryResolve()
  })
}

/**
 * 로컬 영상 파일에서 균등 중간점 프레임을 추출한다.
 * @param {File} file - 사용자 영상 파일
 * @param {ExtractFramesOptions} [options] - 개수/진행률/취소
 * @returns {Promise<ExtractedFrame[]>}
 */
export async function extractVideoFrames(
  file: File,
  options: ExtractFramesOptions = {},
): Promise<ExtractedFrame[]> {
  const count = options.count ?? FRAME_EXTRACT_COUNT
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = objectUrl

  try {
    options.onProgress?.(2)
    const duration = await waitForDuration(video, options.signal)
    const times = buildSampleTimes(duration, count)
    if (times.length === 0) {
      throw new Error('영상 길이를 확인할 수 없습니다.')
    }

    const frames: ExtractedFrame[] = []
    for (let index = 0; index < times.length; index += 1) {
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      const timeSec = times[index]!
      await seekTo(video, timeSec, options.signal)
      const dataUrl = captureFrameDataUrl(video)
      frames.push({
        id: `frame_${index}_${Math.round(timeSec * 1000)}`,
        index,
        timeSec,
        dataUrl,
      })
      options.onProgress?.(Math.round(((index + 1) / times.length) * 100))
    }
    return frames
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}
