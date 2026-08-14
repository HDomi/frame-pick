'use client'

import { useEffect } from 'react'
import type { FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { isBackgroundObject } from '@/lib/background-layer'
import {
  clearSnapGuides,
  computeObjectSnap,
  drawSnapGuides,
} from '@/lib/canvas-snap'

/**
 * 객체 이동 시 아트보드·이웃 객체 스냅 + 가이드선
 * @returns {void}
 */
export function useCanvasSnap() {
  const { canvas, canvasSize, isReady } = useCanvas()

  useEffect(() => {
    if (!canvas || !isReady) {
      return
    }

    /**
     * @param {{ target?: FabricObject }} opt
     * @returns {void}
     */
    const handleMoving = (opt: { target?: FabricObject }) => {
      const target = opt.target
      if (!target || isBackgroundObject(target)) {
        return
      }

      const result = computeObjectSnap(canvas, target, canvasSize)
      if (result.left != null && !target.lockMovementX) {
        target.set('left', result.left)
      }
      if (result.top != null && !target.lockMovementY) {
        target.set('top', result.top)
      }
      target.setCoords()
      drawSnapGuides(canvas, result.guides)
    }

    /**
     * @returns {void}
     */
    const handleClear = () => {
      clearSnapGuides(canvas)
      canvas.requestRenderAll()
    }

    canvas.on('object:moving', handleMoving)
    canvas.on('mouse:up', handleClear)
    canvas.on('selection:cleared', handleClear)

    return () => {
      canvas.off('object:moving', handleMoving)
      canvas.off('mouse:up', handleClear)
      canvas.off('selection:cleared', handleClear)
      clearSnapGuides(canvas)
    }
  }, [canvas, canvasSize, isReady])
}
