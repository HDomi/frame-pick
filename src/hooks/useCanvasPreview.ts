'use client'

import { useCallback, useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { getCanvasDataUrl } from '@/lib/canvas-export'

/**
 * 캔버스 미리보기 모달 상태 훅
 * @returns {{ isOpen: boolean; previewUrl: string | null; openPreview: () => void; closePreview: () => void }}
 */
export function useCanvasPreview() {
  const { canvas, canvasSize, isReady } = useCanvas()
  const [isOpen, setIsOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  /**
   * 현재 작업을 캡처해 미리보기 모달을 연다.
   * @returns {void}
   */
  const openPreview = useCallback(() => {
    if (!isReady) {
      return
    }

    const dataUrl = getCanvasDataUrl(canvas, canvasSize)
    if (!dataUrl) {
      return
    }

    setPreviewUrl(dataUrl)
    setIsOpen(true)
  }, [canvas, canvasSize, isReady])

  /**
   * 미리보기 모달을 닫는다.
   * @returns {void}
   */
  const closePreview = useCallback(() => {
    setIsOpen(false)
    setPreviewUrl(null)
  }, [])

  return {
    isOpen,
    previewUrl,
    openPreview,
    closePreview,
  }
}
