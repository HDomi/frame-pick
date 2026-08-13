'use client'

import { useEffect, useRef } from 'react'
import type { Canvas } from 'fabric'
import { fitCanvasToContainer } from '@/lib/canvas-fit'
import { getWorkspaceSize } from '@/lib/artboard'

/** 패널 드래그 중 ResizeObserver 폭주 완화 */
const FIT_DEBOUNCE_MS = 48

type PanelResizeDetail = {
  phase: 'start' | 'end'
}

import { PANEL_RESIZE_EVENT } from '@/lib/constants'

/**
 * 컨테이너 리사이즈에 맞춰 워크스페이스 표시 크기를 동기화한다.
 * @param {Canvas | null} canvas - Fabric 캔버스
 * @param {React.RefObject<HTMLElement | null>} containerRef - 뷰포트 컨테이너 ref
 * @param {number} artboardWidth - 아트보드 가로
 * @param {number} artboardHeight - 아트보드 세로
 * @returns {void}
 */
export function useCanvasFit(
  canvas: Canvas | null,
  containerRef: React.RefObject<HTMLElement | null>,
  artboardWidth: number,
  artboardHeight: number,
): void {
  const timerRef = useRef<number | null>(null)
  const lastWidthRef = useRef(0)
  const lastHeightRef = useRef(0)
  const panelResizingRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!canvas || !container) {
      return
    }

    const workspace = getWorkspaceSize({ width: artboardWidth, height: artboardHeight })

    /**
     * fit을 즉시 실행한다.
     * @param {boolean} [force=false] - 동일 크기 스킵 무시
     * @returns {void}
     */
    const runFit = (force = false) => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (
        !force &&
        width > 0 &&
        height > 0 &&
        Math.abs(width - lastWidthRef.current) < 1 &&
        Math.abs(height - lastHeightRef.current) < 1
      ) {
        canvas.calcOffset()
        return
      }
      lastWidthRef.current = width
      lastHeightRef.current = height
      fitCanvasToContainer(canvas, container, workspace.width, workspace.height)
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
  }, [canvas, containerRef, artboardWidth, artboardHeight])
}
