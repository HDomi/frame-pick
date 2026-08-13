import type { ExtractedFrame } from '@/types/editor'
import { FRAME_EXTRACT_COUNT, FRAME_SAMPLE_MAX_RATIO } from '@/lib/constants'
import {
  FRAME_APPLY_MAX_EDGE,
  FRAME_THUMB_MAX_EDGE,
  VIDEO_DURATION_RETRY_MS,
  VIDEO_SEEK_TIMEOUT_MS,
} from '@/lib/video-constants'

export interface ExtractFramesOptions {
  count?: number
  /** 자동 샘플링 상한 비율 (기본 0.9) */
  maxRatio?: number
  /** 섬네일 긴 변 상한 */
  thumbMaxEdge?: number
  signal?: AbortSignal
  /**
   * 진행률 콜백 (0~100)
   * @param {number} progress - 진행률
   * @returns {void}
   */
  onProgress?: (progress: number) => void
}

export interface CaptureFrameOptions {
  maxEdge?: number
  signal?: AbortSignal
}

export interface ExtractFramesResult {
  frames: ExtractedFrame[]
  duration: number
}

/**
 * 추출 샘플 시각(초)을 계산한다. 0~maxRatio(기본 90%) 구간에서 균등 중간점 샘플.
 * @param {number} duration - 영상 길이(초)
 * @param {number} count - 프레임 수
 * @param {number} [maxRatio] - 샘플링 상한 비율
 * @returns {number[]}
 */
export function buildSampleTimes(
  duration: number,
  count: number,
  maxRatio: number = FRAME_SAMPLE_MAX_RATIO,
): number[] {
  if (!Number.isFinite(duration) || duration <= 0 || count <= 0) {
    return []
  }
  const clampedMax = Math.min(Math.max(maxRatio, 0.05), 1)
  const end = duration * clampedMax
  return Array.from({ length: count }, (_, index) => {
    const ratio = (index + 0.5) / count
    return Math.min(Math.max(ratio * end, 0), end)
  })
}

/**
 * video를 지정 시각으로 시킹한다. (타임아웃 폴백 포함)
 * @param {HTMLVideoElement} video - video 요소
 * @param {number} timeSec - 목표 시각
 * @param {AbortSignal} [signal] - 취소 시그널
 * @returns {Promise<void>}
 */
export function seekTo(
  video: HTMLVideoElement,
  timeSec: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    let settled = false

    /**
     * 리스너 정리
     * @returns {void}
     */
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      window.clearTimeout(timeoutId)
    }

    /**
     * @returns {void}
     */
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      resolve()
    }

    /**
     * @returns {void}
     */
    const onSeeked = () => {
      finish()
    }

    /**
     * @returns {void}
     */
    const onError = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(new Error('영상 시킹에 실패했습니다. MP4(H.264)로 다시 시도해 주세요.'))
    }

    /**
     * @returns {void}
     */
    const onAbort = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const timeoutId = window.setTimeout(() => {
      // 일부 환경에서 seeked가 누락되어도 근접 프레임으로 진행
      finish()
    }, VIDEO_SEEK_TIMEOUT_MS)

    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    video.currentTime = Math.max(0, timeSec)
  })
}

/**
 * 현재 프레임을 JPEG data URL로 캡처한다. (긴 변 상한으로 다운스케일 가능)
 * @param {HTMLVideoElement} video - video 요소
 * @param {number} [maxEdge] - 긴 변 픽셀 상한
 * @returns {string}
 */
export function captureFrameDataUrl(
  video: HTMLVideoElement,
  maxEdge: number = FRAME_THUMB_MAX_EDGE,
): string {
  const naturalWidth = video.videoWidth || 1
  const naturalHeight = video.videoHeight || 1
  const longest = Math.max(naturalWidth, naturalHeight)
  const scale = longest > maxEdge ? maxEdge / longest : 1
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D를 사용할 수 없습니다.')
  }
  context.drawImage(video, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

/**
 * Infinity duration을 seekable/강제 시킹으로 해소한다.
 * @param {HTMLVideoElement} video - video
 * @param {AbortSignal} [signal] - 취소
 * @returns {Promise<number>}
 */
async function resolveFiniteDuration(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<number> {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration
  }

  try {
    // HTML5 관용: 큰 값으로 시킹하면 duration이 채워지는 경우가 있음
    await seekTo(video, 1e101, signal)
  } catch {
    // ignore
  }

  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration
  }

  if (video.seekable && video.seekable.length > 0) {
    const end = video.seekable.end(video.seekable.length - 1)
    if (Number.isFinite(end) && end > 0) {
      return end
    }
  }

  throw new Error(
    '영상 길이를 확인할 수 없습니다. Chrome에서 MP4(H.264)로 변환 후 다시 시도해 주세요.',
  )
}

/**
 * duration이 유효해질 때까지 대기한다. (Infinity 재시도 포함)
 * @param {HTMLVideoElement} video - video 요소
 * @param {AbortSignal} [signal] - 취소 시그널
 * @returns {Promise<number>}
 */
export function waitForDuration(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    let settled = false

    /**
     * @returns {void}
     */
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('durationchange', onMeta)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      window.clearTimeout(timeoutId)
    }

    /**
     * @returns {Promise<void>}
     */
    const tryFinish = async () => {
      if (settled) {
        return
      }
      try {
        const duration = await resolveFiniteDuration(video, signal)
        if (settled) {
          return
        }
        settled = true
        cleanup()
        resolve(duration)
      } catch (error) {
        // metadata만으로는 아직 부족할 수 있음 — 타임아웃에서 최종 실패
      }
    }

    /**
     * @returns {void}
     */
    const onMeta = () => {
      void tryFinish()
    }

    /**
     * @returns {void}
     */
    const onError = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(
        new Error(
          '영상을 읽을 수 없습니다. Safari/iOS에서는 MOV·HEVC가 제한될 수 있으니 Chrome + MP4(H.264)를 권장합니다.',
        ),
      )
    }

    /**
     * @returns {void}
     */
    const onAbort = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        if (settled) {
          return
        }
        try {
          const duration = await resolveFiniteDuration(video, signal)
          if (settled) {
            return
          }
          settled = true
          cleanup()
          resolve(duration)
        } catch (error) {
          if (settled) {
            return
          }
          settled = true
          cleanup()
          reject(
            error instanceof Error
              ? error
              : new Error('영상 길이를 확인할 수 없습니다.'),
          )
        }
      })()
    }, VIDEO_DURATION_RETRY_MS)

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('durationchange', onMeta)
    video.addEventListener('error', onError)
    signal?.addEventListener('abort', onAbort, { once: true })
    void tryFinish()
  })
}

/**
 * 임시 video 요소를 준비한다.
 * @param {File} file - 영상 파일
 * @returns {{ video: HTMLVideoElement; objectUrl: string }}
 */
function createVideoElement(file: File): { video: HTMLVideoElement; objectUrl: string } {
  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  // iOS: inline + muted 로 사용자 제스처 직후 디코드 허용 범위 확대
  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.src = objectUrl
  return { video, objectUrl }
}

/**
 * video 리소스를 해제한다.
 * @param {HTMLVideoElement} video - video
 * @param {string} objectUrl - object URL
 * @returns {void}
 */
function disposeVideo(video: HTMLVideoElement, objectUrl: string): void {
  video.removeAttribute('src')
  video.load()
  URL.revokeObjectURL(objectUrl)
}

/**
 * 로컬 영상에서 0~90% 구간 균등 프레임을 추출한다. (섬네일은 다운스케일)
 * @param {File} file - 사용자 영상 파일
 * @param {ExtractFramesOptions} [options] - 개수/진행률/취소
 * @returns {Promise<ExtractFramesResult>}
 */
export async function extractVideoFrames(
  file: File,
  options: ExtractFramesOptions = {},
): Promise<ExtractFramesResult> {
  const count = options.count ?? FRAME_EXTRACT_COUNT
  const maxRatio = options.maxRatio ?? FRAME_SAMPLE_MAX_RATIO
  const thumbMaxEdge = options.thumbMaxEdge ?? FRAME_THUMB_MAX_EDGE
  const { video, objectUrl } = createVideoElement(file)

  try {
    options.onProgress?.(2)
    // 사용자 제스처 직후 play/pause로 디코드 파이프 깨우기 (iOS 완화)
    try {
      await video.play()
      video.pause()
    } catch {
      // autoplay 정책 — 무시하고 시킹만 진행
    }

    const duration = await waitForDuration(video, options.signal)
    const times = buildSampleTimes(duration, count, maxRatio)
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
      const dataUrl = captureFrameDataUrl(video, thumbMaxEdge)
      frames.push({
        id: `frame_${index}_${Math.round(timeSec * 1000)}`,
        index,
        timeSec,
        dataUrl,
      })
      options.onProgress?.(Math.round(((index + 1) / times.length) * 100))
    }
    return { frames, duration }
  } finally {
    disposeVideo(video, objectUrl)
  }
}

/**
 * 지정 시각의 프레임 1장을 캡처한다. (수동 시킹 / 고해상도 적용용)
 * @param {File} file - 영상 파일
 * @param {number} timeSec - 캡처 시각(초)
 * @param {CaptureFrameOptions} [options] - 해상도/취소
 * @returns {Promise<ExtractedFrame>}
 */
export async function captureFrameAtTime(
  file: File,
  timeSec: number,
  options: CaptureFrameOptions = {},
): Promise<ExtractedFrame> {
  const maxEdge = options.maxEdge ?? FRAME_APPLY_MAX_EDGE
  const { video, objectUrl } = createVideoElement(file)

  try {
    try {
      await video.play()
      video.pause()
    } catch {
      // ignore
    }

    const duration = await waitForDuration(video, options.signal)
    const clamped = Math.min(Math.max(timeSec, 0), Math.max(duration - 0.05, 0))
    await seekTo(video, clamped, options.signal)
    const dataUrl = captureFrameDataUrl(video, maxEdge)
    return {
      id: `manual_${Math.round(clamped * 1000)}_${Date.now().toString(36)}`,
      index: -1,
      timeSec: clamped,
      dataUrl,
    }
  } finally {
    disposeVideo(video, objectUrl)
  }
}

/**
 * 초를 mm:ss 문자열로 포맷한다.
 * @param {number} timeSec - 초
 * @returns {string}
 */
export function formatTimecode(timeSec: number): string {
  if (!Number.isFinite(timeSec) || timeSec < 0) {
    return '0:00'
  }
  const total = Math.floor(timeSec)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
