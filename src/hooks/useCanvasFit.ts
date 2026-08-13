'use client'

import { useEffect, useRef } from 'react'
import type { Canvas } from 'fabric'
import { fitCanvasToContainer } from '@/lib/canvas-fit'

/**
 * 컨테이너 리사이즈에 맞춰 캔버스 표시 크기를 동기화한다.
 * @param {Canvas | null} canvas - Fabric 캔버스
 * @param {React.RefObject<HTMLElement | null>} containerRef - 뷰포트 컨테이너 ref
 * @param {number} logicalWidth - 논리 가로 해상도
 * @returns {void}
 */
export function useCanvasFit(
  canvas: Canvas | null,
  containerRef: React.RefObject<HTMLElement | null>,
  logicalWidth: number,
): void {
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }

    /**
     * 다음 프레임에 fit을 실행한다.
     * @returns {void}
     */
    const scheduleFit = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = requestAnimationFrame(() => {
        fitCanvasToContainer(canvas, container, logicalWidth)
      })
    }

    scheduleFit()

    const observer = new ResizeObserver(() => {
      scheduleFit()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [canvas, containerRef, logicalWidth])
}
