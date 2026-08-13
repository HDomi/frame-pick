'use client'

import { useEffect, useRef } from 'react'
import type { FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { normalizeCanvasTextObjects } from '@/lib/normalize-canvas-text'

/** 연속 입력/복붙 중 정규화 폭주 완화 */
const NORMALIZE_DEBOUNCE_MS = 120

/**
 * 긴 텍스트가 IText로 한 줄 확장되며 레이아웃을 깨지 않도록 감시한다.
 * 편집 중에는 건드리지 않고, 편집 종료·수정 완료 후에만 정규화한다.
 * @returns {void}
 */
export function useTextOverflowGuard(): void {
  const { canvas, canvasSize } = useCanvas()
  const timerRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  useEffect(() => {
    if (!canvas) {
      return
    }

    /**
     * @returns {void}
     */
    const runNormalize = () => {
      if (runningRef.current || canvas.disposed) {
        return
      }
      runningRef.current = true
      try {
        normalizeCanvasTextObjects(canvas, canvasSize)
      } finally {
        runningRef.current = false
      }
    }

    /**
     * @returns {void}
     */
    const scheduleNormalize = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        runNormalize()
      }, NORMALIZE_DEBOUNCE_MS)
    }

    /**
     * @param {{ target?: FabricObject }} event
     * @returns {void}
     */
    const handleTextChanged = (event: { target?: FabricObject }) => {
      const target = event.target
      if (!target) {
        return
      }
      // 입력/복붙 중에는 Fabric 내부 canvas 참조가 불안정 — 편집 종료 후 처리
      if ((target as { isEditing?: boolean }).isEditing) {
        return
      }
      scheduleNormalize()
    }

    /**
     * @returns {void}
     */
    const handleEditingExited = () => {
      scheduleNormalize()
    }

    canvas.on('text:changed', handleTextChanged)
    canvas.on('object:modified', handleTextChanged)
    canvas.on('text:editing:exited', handleEditingExited)

    return () => {
      canvas.off('text:changed', handleTextChanged)
      canvas.off('object:modified', handleTextChanged)
      canvas.off('text:editing:exited', handleEditingExited)
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [canvas, canvasSize])
}
