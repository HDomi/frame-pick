'use client'

import { useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { exportCanvasAsPng } from '@/lib/canvas-export'

/**
 * 캔버스 PNG 다운로드 훅
 * @returns {{ downloadPng: () => boolean }} - 다운로드 API
 */
export function useCanvasDownload() {
  const { canvas, isReady, canvasSize } = useCanvas()

  /**
   * 현재 캔버스를 PNG로 저장한다.
   * @returns {boolean} - 성공 여부
   */
  const downloadPng = useCallback(() => {
    if (!isReady) {
      return false
    }
    return exportCanvasAsPng(canvas, canvasSize)
  }, [canvas, canvasSize, isReady])

  return { downloadPng }
}
