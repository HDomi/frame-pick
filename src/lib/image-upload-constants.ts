/** 일반 이미지 업로드 하드 상한 (25MB) */
export const IMAGE_MAX_FILE_BYTES = 25 * 1024 * 1024

/** 이 크기 이상이면 경고 토스트 (10MB) */
export const IMAGE_SIZE_WARN_BYTES = 10 * 1024 * 1024

/**
 * 바이트를 MB 문자열로 표시한다.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytesAsMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
}
