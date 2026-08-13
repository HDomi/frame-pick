'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { isEditableKeyboardTarget } from '@/lib/canvas-clipboard'
import {
  CANVAS_ZOOM_STEP,
  clampCanvasZoom,
  panCanvasBy,
  resetCanvasViewport,
  screenDeltaToCanvas,
  zoomCanvasCentered,
  zoomCanvasToPoint,
  zoomToPercent,
} from '@/lib/canvas-zoom'

type PointerDownOpt = {
  e: Event
  target?: FabricObject
}

/**
 * 포토샵형 뷰포트 줌/팬.
 * - 빈 곳 드래그 / 스페이스·휠버튼 드래그 / 트랙패드 스크롤 → 팬
 * - 핀치·Ctrl+휠 / 버튼 → 줌
 * - Shift+빈 곳 드래그 → 마퀴 다중선택
 * export 해상도와 무관.
 * @returns 줌 UI API
 */
export function useCanvasViewportZoom() {
  const { canvas, isReady } = useCanvas()
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)

  /**
   * 현재 Fabric 줌을 상태에 동기화한다.
   * @returns {void}
   */
  const syncZoom = useCallback(() => {
    if (!canvas) {
      setZoom(1)
      return
    }
    setZoom(clampCanvasZoom(canvas.getZoom()))
  }, [canvas])

  useEffect(() => {
    if (!canvas || !isReady) {
      return
    }

    syncZoom()

    let isDragging = false
    let lastX = 0
    let lastY = 0
    let spaceDown = false
    let prevSelection: boolean | null = null
    let prevDefaultCursor: string | null = null

    /**
     * 팬 중 selection(마퀴)을 끈다.
     * @returns {void}
     */
    const beginPanSession = () => {
      if (prevSelection === null) {
        prevSelection = canvas.selection
        prevDefaultCursor = canvas.defaultCursor
      }
      canvas.selection = false
      setIsPanning(true)
    }

    /**
     * @returns {void}
     */
    const endPanSession = () => {
      if (prevSelection !== null) {
        canvas.selection = prevSelection
        canvas.defaultCursor = prevDefaultCursor ?? 'default'
        prevSelection = null
        prevDefaultCursor = null
      }
      canvas.setCursor(spaceDown ? 'grab' : canvas.defaultCursor)
      setIsPanning(false)
    }

    /**
     * @param {boolean} active
     * @returns {void}
     */
    const setSpacePanMode = (active: boolean) => {
      if (active) {
        beginPanSession()
        canvas.defaultCursor = 'grab'
        canvas.setCursor('grab')
        return
      }
      if (!isDragging) {
        endPanSession()
      }
    }

    /**
     * @param {{ e: Event }} opt
     * @returns {void}
     */
    const handleWheel = (opt: { e: Event }) => {
      const event = opt.e
      if (!(event instanceof WheelEvent)) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      // 핀치 / Ctrl·⌘+휠 → 줌, 그 외 스크롤 → 팬
      // zoomToPoint는 뷰포트(캔버스 화면) 좌표가 필요 — getScenePoint면 커서와 어긋남
      if (event.ctrlKey || event.metaKey) {
        const next = canvas.getZoom() * Math.exp(-event.deltaY * 0.01)
        const point = canvas.getViewportPoint(event)
        setZoom(zoomCanvasToPoint(canvas, point, next))
        return
      }

      const delta = screenDeltaToCanvas(canvas, -event.deltaX, -event.deltaY)
      panCanvasBy(canvas, delta.x, delta.y)
    }

    /**
     * @param {PointerDownOpt} opt
     * @returns {void}
     */
    const handleMouseDown = (opt: PointerDownOpt) => {
      const event = opt.e
      if (!(event instanceof MouseEvent)) {
        return
      }

      const middle = event.button === 1
      const left = event.button === 0
      if (!left && !middle) {
        return
      }

      const active = canvas.getActiveObject() as { isEditing?: boolean } | null
      if (active?.isEditing) {
        return
      }

      const onObject = Boolean(opt.target)
      // Shift+빈 곳 = 마퀴 다중선택 (Fabric 기본)
      if (left && !onObject && event.shiftKey && !spaceDown && !middle) {
        return
      }

      const shouldPan =
        middle || spaceDown || (left && !onObject && !event.shiftKey)

      if (!shouldPan) {
        return
      }

      beginPanSession()
      isDragging = true
      lastX = event.clientX
      lastY = event.clientY
      canvas.setCursor('grabbing')
      event.preventDefault()
      event.stopPropagation()
    }

    /**
     * @param {{ e: Event }} opt
     * @returns {void}
     */
    const handleMouseMove = (opt: { e: Event }) => {
      if (!isDragging) {
        return
      }
      const event = opt.e
      if (!(event instanceof MouseEvent)) {
        return
      }
      const delta = screenDeltaToCanvas(
        canvas,
        event.clientX - lastX,
        event.clientY - lastY,
      )
      panCanvasBy(canvas, delta.x, delta.y)
      lastX = event.clientX
      lastY = event.clientY
    }

    /**
     * @returns {void}
     */
    const handleMouseUp = () => {
      if (!isDragging) {
        return
      }
      isDragging = false
      if (spaceDown) {
        canvas.setCursor('grab')
        setIsPanning(true)
        return
      }
      endPanSession()
    }

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) {
        return
      }
      const active = canvas.getActiveObject() as { isEditing?: boolean } | null
      if (active?.isEditing) {
        return
      }

      if (event.code === 'Space' && !event.repeat) {
        spaceDown = true
        setSpacePanMode(true)
        event.preventDefault()
        return
      }

      const mod = event.metaKey || event.ctrlKey
      if (!mod || event.altKey) {
        return
      }

      if (event.key === '=' || event.key === '+') {
        event.preventDefault()
        setZoom(zoomCanvasCentered(canvas, canvas.getZoom() * CANVAS_ZOOM_STEP))
        return
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setZoom(zoomCanvasCentered(canvas, canvas.getZoom() / CANVAS_ZOOM_STEP))
        return
      }
      if (event.key === '0') {
        event.preventDefault()
        resetCanvasViewport(canvas)
        setZoom(1)
      }
    }

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') {
        return
      }
      spaceDown = false
      if (isDragging) {
        return
      }
      setSpacePanMode(false)
    }

    canvas.on('mouse:wheel', handleWheel)
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      canvas.off('mouse:wheel', handleWheel)
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      isDragging = false
      endPanSession()
    }
  }, [canvas, isReady, syncZoom])

  /**
   * @returns {void}
   */
  const zoomIn = useCallback(() => {
    if (!canvas) {
      return
    }
    setZoom(zoomCanvasCentered(canvas, canvas.getZoom() * CANVAS_ZOOM_STEP))
  }, [canvas])

  /**
   * @returns {void}
   */
  const zoomOut = useCallback(() => {
    if (!canvas) {
      return
    }
    setZoom(zoomCanvasCentered(canvas, canvas.getZoom() / CANVAS_ZOOM_STEP))
  }, [canvas])

  /**
   * @returns {void}
   */
  const zoomToFit = useCallback(() => {
    if (!canvas) {
      return
    }
    resetCanvasViewport(canvas)
    setZoom(1)
  }, [canvas])

  /**
   * @param {number} percent - 예: 100
   * @returns {void}
   */
  const setZoomPercent = useCallback(
    (percent: number) => {
      if (!canvas) {
        return
      }
      setZoom(zoomCanvasCentered(canvas, percent / 100))
    },
    [canvas],
  )

  return {
    zoom,
    zoomPercent: zoomToPercent(zoom),
    isPanning,
    /** @deprecated isPanning 사용 */
    isSpacePanning: isPanning,
    zoomIn,
    zoomOut,
    zoomToFit,
    setZoomPercent,
  }
}
