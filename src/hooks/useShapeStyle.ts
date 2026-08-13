'use client'

import { useCallback, useEffect, useState } from 'react'
import { Line, type FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { colorToFabricColor, parseHexColor } from '@/lib/color-repository'
import { isEditorShapeObject } from '@/lib/editor-shapes'
import {
  createFabricFill,
  createSolidFill,
  parseFabricFill,
  type FillValue,
} from '@/lib/fill-value'

export interface ShapeStyleState {
  fill: FillValue
  stroke: string
  strokeWidth: number
  opacity: number
  /** 직선은 채움 없음 */
  isLine: boolean
}

const DEFAULT_SHAPE_STYLE: ShapeStyleState = {
  fill: createSolidFill('#3b82f6', 1),
  stroke: '#ffffff',
  strokeWidth: 4,
  opacity: 1,
  isLine: false,
}

/**
 * 활성 도형의 채움·선 스타일 훅
 * @returns 도형 스타일 API
 */
export function useShapeStyle() {
  const { canvas } = useCanvas()
  const [hasShapeTarget, setHasShapeTarget] = useState(false)
  const [style, setStyle] = useState<ShapeStyleState>(DEFAULT_SHAPE_STYLE)

  /**
   * @returns {void}
   */
  const syncFromCanvas = useCallback(() => {
    if (!canvas) {
      setHasShapeTarget(false)
      return
    }
    const active = canvas.getActiveObject()
    if (!isEditorShapeObject(active)) {
      setHasShapeTarget(false)
      return
    }

    setHasShapeTarget(true)
    const isLine = active instanceof Line
    const strokeRaw = String(active.stroke ?? DEFAULT_SHAPE_STYLE.stroke)
    const strokeParsed = parseHexColor(strokeRaw)
    setStyle({
      fill: parseFabricFill(active.fill, '#3b82f6'),
      stroke: strokeParsed?.hex ?? DEFAULT_SHAPE_STYLE.stroke,
      strokeWidth: Number(active.strokeWidth ?? DEFAULT_SHAPE_STYLE.strokeWidth),
      opacity: Number(active.opacity ?? 1),
      isLine,
    })
  }, [canvas])

  useEffect(() => {
    if (!canvas) {
      return
    }
    const handleSync = () => {
      syncFromCanvas()
    }
    canvas.on('selection:created', handleSync)
    canvas.on('selection:updated', handleSync)
    canvas.on('selection:cleared', handleSync)
    canvas.on('object:modified', handleSync)
    syncFromCanvas()
    return () => {
      canvas.off('selection:created', handleSync)
      canvas.off('selection:updated', handleSync)
      canvas.off('selection:cleared', handleSync)
      canvas.off('object:modified', handleSync)
    }
  }, [canvas, syncFromCanvas])

  /**
   * @param {Partial<{ fill: FillValue; stroke: string; strokeWidth: number; opacity: number }>} patch
   * @returns {boolean}
   */
  const applyStylePatch = useCallback(
    (
      patch: Partial<{
        fill: FillValue
        stroke: string
        strokeWidth: number
        opacity: number
      }>,
    ): boolean => {
      if (!canvas) {
        return false
      }
      const active = canvas.getActiveObject() as FabricObject | undefined
      if (!isEditorShapeObject(active)) {
        return false
      }

      if (patch.fill && !(active instanceof Line)) {
        active.set('fill', createFabricFill(patch.fill))
      }
      if (patch.stroke) {
        active.set('stroke', colorToFabricColor(patch.stroke))
      }
      if (typeof patch.strokeWidth === 'number') {
        active.set('strokeWidth', Math.max(0, patch.strokeWidth))
      }
      if (typeof patch.opacity === 'number') {
        active.set('opacity', Math.min(1, Math.max(0, patch.opacity)))
      }

      active.set('dirty', true)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      syncFromCanvas()
      return true
    },
    [canvas, syncFromCanvas],
  )

  return {
    hasShapeTarget,
    style,
    applyStylePatch,
  }
}
