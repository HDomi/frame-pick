'use client'

import { useCallback } from 'react'
import { IText } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import {
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_STROKE,
  DEFAULT_TEXT_STROKE_WIDTH,
} from '@/lib/constants'
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
   * 기본 스타일 텍스트 객체를 캔버스 중앙에 추가한다.
   * @returns {Promise<void>}
   */
  const addText = useCallback(async () => {
    if (!canvas) {
      return
    }

    const fontLoaded = await ensureEditorFontLoaded()
    const fontFamily = fontLoaded ? EDITOR_FONT_FAMILY : 'sans-serif'
    const fontSizeScale = canvasSize.width / 1920

    const text = new IText('텍스트를 입력하세요', {
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      originX: 'center',
      originY: 'center',
      fill: DEFAULT_TEXT_FILL,
      stroke: DEFAULT_TEXT_STROKE,
      strokeWidth: DEFAULT_TEXT_STROKE_WIDTH * fontSizeScale,
      fontSize: DEFAULT_TEXT_FONT_SIZE * fontSizeScale,
      fontFamily,
      fontWeight: '700',
      paintFirst: 'stroke',
    })

    const layer = ensureLayerMeta(text)
    layer.layerId = createLayerId()
    layer.layerType = 'text'
    layer.layerName = createDefaultLayerName('text', text)

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.requestRenderAll()
  }, [canvas, canvasSize.height, canvasSize.width])

  return { addText }
}
