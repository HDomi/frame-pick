'use client'

import { useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { exportCanvas, exportCanvasAsPng } from '@/lib/canvas-export'
import type { ExportOptions } from '@/lib/export-options'

/**
 * 캔버스 다운로드 훅
 * @returns {{ downloadPng: () => boolean; exportWithOptions: (options: ExportOptions) => boolean }}
 */
export function useCanvasDownload() {
  const { canvas, isReady, canvasSize } = useCanvas()

  /**
   * 현재 캔버스를 PNG(아트보드 크기)로 저장한다.
   * @returns {boolean}
   */
  const downloadPng = useCallback(() => {
    if (!isReady) {
      return false
    }
    return exportCanvasAsPng(canvas, canvasSize)
  }, [canvas, canvasSize, isReady])

  /**
   * 사용자가 고른 옵션으로 내보낸다.
   * @param {ExportOptions} options
   * @returns {boolean}
   */
  const exportWithOptions = useCallback(
    (options: ExportOptions) => {
      if (!isReady) {
        return false
      }
      return exportCanvas(canvas, canvasSize, options)
    },
    [canvas, canvasSize, isReady],
  )

  return { downloadPng, exportWithOptions, artboardSize: canvasSize, isReady }
}
