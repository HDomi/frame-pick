'use client'

import { useEffect, useRef } from 'react'
import type { Canvas } from 'fabric'
import { fitCanvasToContainer } from '@/lib/canvas-fit'
import { PANEL_RESIZE_EVENT } from '@/lib/constants'

/** 패널 드래그 중 ResizeObserver 폭주 완화 */
const FIT_DEBOUNCE_MS = 48

type PanelResizeDetail = {
  phase: 'start' | 'end'
}

/**
 * 컨테이너 리사이즈에 맞춰 캔버스 표시 크기를 동기화한다.
 * 패널 드래그 중에는 fit을 멈추고, 종료 시 한 번만 맞춘다.
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
  const timerRef = useRef<number | null>(null)
  const lastWidthRef = useRef(0)
  const panelResizingRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }

    /**
     * fit을 즉시 실행한다.
     * @param {boolean} [force=false] - 동일 너비 스킵 무시
     * @returns {void}
     */
    const runFit = (force = false) => {
      const width = container.clientWidth
      if (!force && width > 0 && Math.abs(width - lastWidthRef.current) < 1) {
        canvas.calcOffset()
        return
      }
      lastWidthRef.current = width
      fitCanvasToContainer(canvas, container, logicalWidth)
    }

    /**
     * 디바운스 후 fit.
     * @returns {void}
     */
    const scheduleFit = () => {
      if (panelResizingRef.current) {
        return
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        if (!panelResizingRef.current) {
          runFit()
        }
      }, FIT_DEBOUNCE_MS)
    }

    /**
     * 패널 리사이즈 시작/종료를 반영한다.
     * @param {Event} event - CustomEvent
     * @returns {void}
     */
    const handlePanelResize = (event: Event) => {
      const detail = (event as CustomEvent<PanelResizeDetail>).detail
      if (!detail) {
        return
      }
      if (detail.phase === 'start') {
        panelResizingRef.current = true
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }
        return
      }
      panelResizingRef.current = false
      runFit(true)
    }

    runFit(true)

    const observer = new ResizeObserver(() => {
      scheduleFit()
    })
    observer.observe(container)
    window.addEventListener(PANEL_RESIZE_EVENT, handlePanelResize)

    return () => {
      observer.disconnect()
      window.removeEventListener(PANEL_RESIZE_EVENT, handlePanelResize)
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [canvas, containerRef, logicalWidth])
}
