'use client'

import { useCallback } from 'react'
import { FabricImage } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { createLayerId, ensureLayerMeta } from '@/lib/layers'
import { getStickerUrl } from '@/lib/stickers'

/**
 * 스티커를 캔버스에 추가하는 훅
 * @returns {{ addSticker: (relativePath: string, name: string) => Promise<boolean> }}
 */
export function useCanvasSticker() {
  const { canvas, canvasSize, isReady } = useCanvas()

  /**
   * SVG 스티커를 캔버스 중앙에 추가한다.
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
      const image = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      })

      const targetWidth = canvasSize.width * 0.18
      const naturalWidth = image.width || 1
      const scale = targetWidth / naturalWidth
      image.set({
        left: canvasSize.width / 2,
        top: canvasSize.height / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
      })

      const layer = ensureLayerMeta(image)
      layer.layerId = createLayerId()
      layer.layerType = 'sticker'
      layer.layerName = name

      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()
      return true
    },
    [canvas, canvasSize.height, canvasSize.width],
  )

  return { isReady, addSticker }
}
