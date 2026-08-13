import {
  CUTOUT_MAX_FILE_BYTES,
  CUTOUT_WARN_EDGE,
} from '@/lib/cutout-constants'

export interface DeviceCapability {
  isLowSpec: boolean
  isMobileLike: boolean
  reasons: string[]
}

/**
 * 누끼 실행 전 저사양/모바일 여부를 판정한다.
 * @returns {DeviceCapability}
 */
export function detectDeviceCapability(): DeviceCapability {
  const reasons: string[] = []
  const nav = typeof navigator !== 'undefined' ? navigator : null

  const deviceMemory =
    nav && 'deviceMemory' in nav
      ? Number((nav as Navigator & { deviceMemory?: number }).deviceMemory)
      : undefined
  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) {
    reasons.push(`메모리 약 ${deviceMemory}GB`)
  }

  const cores = nav?.hardwareConcurrency ?? 0
  if (cores > 0 && cores <= 4) {
    reasons.push(`CPU 코어 ${cores}개`)
  }

  const isMobileLike =
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches)
  if (isMobileLike) {
    reasons.push('모바일/터치 환경')
  }

  return {
    isLowSpec: reasons.length > 0,
    isMobileLike,
    reasons,
  }
}

/**
 * 파일 크기·해상도 기준으로 사전 경고가 필요한지 본다.
 * @param {File} file - 이미지 파일
 * @param {number} [longestEdge] - 긴 변(px), 알면 전달
 * @returns {string[]} - 경고 사유
 */
export function getCutoutInputWarnings(file: File, longestEdge?: number): string[] {
  const warnings: string[] = []
  if (file.size > CUTOUT_MAX_FILE_BYTES) {
    warnings.push(`파일이 ${(file.size / (1024 * 1024)).toFixed(1)}MB로 큽니다`)
  }
  if (typeof longestEdge === 'number' && longestEdge > CUTOUT_WARN_EDGE) {
    warnings.push(`해상도 긴 변이 ${longestEdge}px입니다`)
  }
  return warnings
}

/**
 * 이미지 파일의 긴 변을 읽는다.
 * @param {File} file - 이미지
 * @returns {Promise<number>}
 */
export function readImageLongestEdge(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    /**
     * @returns {void}
     */
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(Math.max(image.naturalWidth, image.naturalHeight))
    }
    /**
     * @returns {void}
     */
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽을 수 없습니다.'))
    }
    image.src = url
  })
}

/**
 * 긴 변이 maxEdge를 넘으면 리사이즈한 Blob을 반환한다.
 * @param {File} file - 원본
 * @param {number} maxEdge - 긴 변 상한
 * @returns {Promise<Blob>}
 */
export async function downscaleImageFile(file: File, maxEdge: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지 로드 실패'))
      el.src = url
    })

    const longest = Math.max(image.naturalWidth, image.naturalHeight)
    if (longest <= maxEdge) {
      return file
    }

    const scale = maxEdge / longest
    const width = Math.round(image.naturalWidth * scale)
    const height = Math.round(image.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas를 사용할 수 없습니다.')
    }
    ctx.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
            return
          }
          reject(new Error('리사이즈에 실패했습니다.'))
        },
        'image/png',
      )
    })
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
