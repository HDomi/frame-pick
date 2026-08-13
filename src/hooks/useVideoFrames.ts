'use client'

import { useVideoSession } from '@/contexts/VideoSessionContext'

/**
 * 영상 프레임 추출 상태 훅 (VideoSession 래퍼)
 * @returns 프레임 목록 및 추출 상태
 */
export function useVideoFrames() {
  const { frames, hasVideo, isDialogOpen } = useVideoSession()

  return {
    frames,
    isExtracting: false,
    hasVideo,
    isDialogOpen,
  }
}
