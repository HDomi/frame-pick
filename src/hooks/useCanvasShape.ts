'use client'

import { useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { getArtboardBounds } from '@/lib/artboard'
import {
  createEditorShape,
  type EditorShapeKind,
} from '@/lib/editor-shapes'
import { createDefaultLayerName, createLayerId, ensureLayerMeta } from '@/lib/layers'

/**
 * 캔버스에 간단 도형·직선을 추가하는 훅
 * @returns {{ addShape: (kind: EditorShapeKind) => boolean }}
 */
export function useCanvasShape() {
  const { canvas, canvasSize } = useCanvas()

  /**
   * 선택한 종류의 도형을 아트보드 중앙에 추가한다.
   * @param {EditorShapeKind} kind
   * @returns {boolean}
   */
  const addShape = useCallback(
    (kind: EditorShapeKind): boolean => {
      if (!canvas) {
        return false
      }

      const bounds = getArtboardBounds(canvas, canvasSize)
      const shape = createEditorShape(kind, bounds, canvasSize.width / 1920)
      const layer = ensureLayerMeta(shape)
      layer.layerId = createLayerId()
      layer.layerType = 'shape'
      layer.layerName = createDefaultLayerName('shape', shape)

      canvas.add(shape)
      canvas.setActiveObject(shape)
      canvas.requestRenderAll()
      return true
    },
    [canvas, canvasSize],
  )

  return { addShape }
}
