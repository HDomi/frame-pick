'use client'

import { useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { getArtboardBounds } from '@/lib/artboard'
import { createEditorTextbox } from '@/lib/editor-text'
import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'
import { ensureEditorFontLoaded } from '@/lib/fonts'
import { createDefaultLayerName, createLayerId, ensureLayerMeta } from '@/lib/layers'

/**
 * 캔버스에 유튜브 스타일 기본 텍스트를 추가하는 훅
 * @returns {{ addText: () => Promise<void> }} - 텍스트 추가 API
 */
export function useCanvasText() {
  const { canvas, canvasSize } = useCanvas()

  /**
   * 기본 스타일 텍스트 객체를 아트보드 중앙에 추가한다.
   * @returns {Promise<void>}
   */
  const addText = useCallback(async () => {
    if (!canvas) {
      return
    }

    const fontLoaded = await ensureEditorFontLoaded()
    const fontFamily = fontLoaded ? EDITOR_FONT_FAMILY : 'sans-serif'
    const bounds = getArtboardBounds(canvas, canvasSize)

    const text = createEditorTextbox({
      text: '텍스트를 입력하세요',
      bounds,
      fontSizeScale: canvasSize.width / 1920,
      fontFamily,
    })

    const layer = ensureLayerMeta(text)
    layer.layerId = createLayerId()
    layer.layerType = 'text'
    layer.layerName = createDefaultLayerName('text', text)

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()
  }, [canvas, canvasSize])

  return { addText }
}
