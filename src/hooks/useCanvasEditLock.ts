'use client'

import { useEffect, useRef } from 'react'
import { useLoading } from '@/contexts/LoadingContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'

/**
 * 추출/전역 로딩 중 캔버스 인터랙션을 잠근다.
 * @returns {void}
 */
export function useCanvasEditLock(): void {
  const { canvas } = useCanvas()
  const { isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const locked = isLoading || isExtracting
  const prevSelectionRef = useRef(true)

  useEffect(() => {
    if (!canvas) {
      return
    }

    if (locked) {
      prevSelectionRef.current = canvas.selection
      canvas.discardActiveObject()
      canvas.selection = false
      canvas.skipTargetFind = true
      canvas.defaultCursor = 'not-allowed'
      canvas.hoverCursor = 'not-allowed'
      canvas.requestRenderAll()
      return
    }

    canvas.selection = prevSelectionRef.current
    canvas.skipTargetFind = false
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.requestRenderAll()
  }, [canvas, locked])
}
