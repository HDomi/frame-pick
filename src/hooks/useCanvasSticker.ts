'use client'

import { useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { getArtboardBounds, getArtboardCenter } from '@/lib/artboard'
import { createLayerId, ensureLayerMeta } from '@/lib/layers'
import { loadStickerFabricObject } from '@/lib/load-sticker'
import { getStickerUrl } from '@/lib/stickers'

/**
 * 스티커를 캔버스에 추가하는 훅
 * @returns {{ addSticker: (relativePath: string, name: string) => Promise<boolean> }}
 */
export function useCanvasSticker() {
  const { canvas, canvasSize, isReady } = useCanvas()

  /**
   * SVG 스티커를 아트보드 중앙에 추가한다.
   * @param {string} relativePath - stickers/ 하위 경로
   * @param {string} name - 레이어 이름
   * @returns {Promise<boolean>}
   */
  const addSticker = useCallback(
    async (relativePath: string, name: string): Promise<boolean> => {
      if (!canvas) {
        return false
      }

      const url = getStickerUrl(relativePath)
      const sticker = await loadStickerFabricObject(url)

      const bounds = getArtboardBounds(canvas, canvasSize)
      const center = getArtboardCenter(bounds)
      const targetWidth = bounds.width * 0.18
      const naturalWidth = Math.max(sticker.width || 1, 1)
      const scale = targetWidth / naturalWidth

      sticker.set({
        left: center.left,
        top: center.top,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        objectCaching: false,
      })
      sticker.setCoords()

      const layer = ensureLayerMeta(sticker)
      layer.layerId = createLayerId()
      layer.layerType = 'sticker'
      layer.layerName = name

      canvas.add(sticker)
      canvas.setActiveObject(sticker)
      canvas.requestRenderAll()
      return true
    },
    [canvas, canvasSize],
  )

  return { isReady, addSticker }
}
