'use client'

import { useCallback, useEffect, useState } from 'react'
import { IText, Shadow, Textbox, type FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { getArtboardBounds, getArtboardCenter } from '@/lib/artboard'
import { normalizeHexColor } from '@/lib/color-repository'
import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'
import { parseFabricFill } from '@/lib/fill-value'
import { createDefaultLayerName, createLayerId, ensureLayerMeta } from '@/lib/layers'
import {
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_SHADOW,
  DEFAULT_TEXT_STROKE,
  DEFAULT_TEXT_STROKE_WIDTH,
} from '@/lib/text-presets'
import type { TextStylePreset } from '@/types/editor'

type TextObject = IText | Textbox

export interface TextStyleState {
  fill: string
  stroke: string
  strokeWidth: number
  fontSize: number
  fontFamily: string
  shadowEnabled: boolean
  highlightEnabled: boolean
  highlightColor: string
}

/**
 * 텍스트 계열 객체인지 판별한다.
 * @param {FabricObject | null | undefined} object - 후보
 * @returns {object is TextObject}
 */
function isTextObject(object: FabricObject | null | undefined): object is TextObject {
  if (!object) {
    return false
  }
  return object instanceof IText || object instanceof Textbox
}

/**
 * 활성 텍스트의 스타일(채움/외곽선/그림자/하이라이트) 훅
 * @returns 텍스트 스타일 API
 */
export function useTextStyle() {
  const { canvas, canvasSize } = useCanvas()
  const [hasTextTarget, setHasTextTarget] = useState(false)
  const [style, setStyle] = useState<TextStyleState>({
    fill: DEFAULT_TEXT_FILL,
    stroke: DEFAULT_TEXT_STROKE,
    strokeWidth: DEFAULT_TEXT_STROKE_WIDTH,
    fontSize: 96,
    fontFamily: EDITOR_FONT_FAMILY,
    shadowEnabled: false,
    highlightEnabled: false,
    highlightColor: '#000000',
  })

  /**
   * 캔버스 선택에서 UI 상태를 동기화한다.
   * @returns {void}
   */
  const syncFromCanvas = useCallback(() => {
    if (!canvas) {
      setHasTextTarget(false)
      return
    }
    const active = canvas.getActiveObject()
    if (!isTextObject(active)) {
      setHasTextTarget(false)
      return
    }

    setHasTextTarget(true)
    const shadow = active.shadow as Shadow | null | undefined
    const fillValue = parseFabricFill(active.fill, DEFAULT_TEXT_FILL)
    setStyle({
      fill: fillValue.mode === 'solid' ? fillValue.color : fillValue.colorA,
      stroke:
        normalizeHexColor(String(active.stroke ?? DEFAULT_TEXT_STROKE)) ?? DEFAULT_TEXT_STROKE,
      strokeWidth: Number(active.strokeWidth ?? DEFAULT_TEXT_STROKE_WIDTH),
      fontSize: Number(active.fontSize ?? 96),
      fontFamily: String(active.fontFamily ?? EDITOR_FONT_FAMILY),
      shadowEnabled: Boolean(shadow && (shadow.blur > 0 || shadow.offsetX || shadow.offsetY)),
      highlightEnabled: Boolean(active.textBackgroundColor),
      highlightColor:
        normalizeHexColor(String(active.textBackgroundColor ?? '#000000')) ?? '#000000',
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
   * 활성 텍스트에 부분 필드를 적용한다.
   * @param {Partial<TextStyleState>} patch - 변경분
   * @returns {boolean}
   */
  const applyStylePatch = useCallback(
    (patch: Partial<TextStyleState>): boolean => {
      if (!canvas) {
        return false
      }
      const active = canvas.getActiveObject()
      if (!isTextObject(active)) {
        return false
      }

      if (patch.fill) {
        active.set('fill', patch.fill)
      }
      if (patch.stroke) {
        active.set('stroke', patch.stroke)
      }
      if (typeof patch.strokeWidth === 'number') {
        active.set('strokeWidth', patch.strokeWidth)
      }
      if (typeof patch.fontSize === 'number') {
        active.set('fontSize', patch.fontSize)
      }
      if (patch.fontFamily) {
        active.set('fontFamily', patch.fontFamily)
      }
      if (typeof patch.shadowEnabled === 'boolean') {
        if (patch.shadowEnabled) {
          active.set(
            'shadow',
            new Shadow({
              color: DEFAULT_TEXT_SHADOW.color,
              blur: DEFAULT_TEXT_SHADOW.blur,
              offsetX: DEFAULT_TEXT_SHADOW.offsetX,
              offsetY: DEFAULT_TEXT_SHADOW.offsetY,
            }),
          )
        } else {
          active.set('shadow', null)
        }
      }
      if (typeof patch.highlightEnabled === 'boolean' || patch.highlightColor) {
        const enabled =
          typeof patch.highlightEnabled === 'boolean'
            ? patch.highlightEnabled
            : Boolean(active.textBackgroundColor)
        const color = patch.highlightColor ?? style.highlightColor
        active.set('textBackgroundColor', enabled ? color : '')
      }

      active.set('paintFirst', 'stroke')
      active.set('dirty', true)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      syncFromCanvas()
      return true
    },
    [canvas, style.highlightColor, syncFromCanvas],
  )

  /**
   * 프리셋을 선택 텍스트에 적용하거나, 없으면 새 텍스트를 추가한다.
   * @param {TextStylePreset} preset - 프리셋
   * @returns {boolean}
   */
  const applyPreset = useCallback(
    (preset: TextStylePreset): boolean => {
      if (!canvas) {
        return false
      }

      const scale = canvasSize.width / 1920
      const active = canvas.getActiveObject()
      if (isTextObject(active)) {
        active.set({
          fill: preset.fill,
          stroke: preset.stroke,
          strokeWidth: preset.strokeWidth * scale,
          fontSize: preset.fontSize * scale,
          fontFamily: preset.fontFamily,
          fontWeight: '700',
          paintFirst: 'stroke',
          shadow: new Shadow({
            color: DEFAULT_TEXT_SHADOW.color,
            blur: DEFAULT_TEXT_SHADOW.blur,
            offsetX: DEFAULT_TEXT_SHADOW.offsetX,
            offsetY: DEFAULT_TEXT_SHADOW.offsetY,
          }),
        })
        active.set('dirty', true)
        canvas.requestRenderAll()
        canvas.fire('object:modified', { target: active })
        syncFromCanvas()
        return true
      }

      const bounds = getArtboardBounds(canvas, canvasSize)
      const center = getArtboardCenter(bounds)
      const text = new IText(preset.name, {
        left: center.left,
        top: center.top,
        originX: 'center',
        originY: 'center',
        fill: preset.fill,
        stroke: preset.stroke,
        strokeWidth: preset.strokeWidth * scale,
        fontSize: preset.fontSize * scale,
        fontFamily: preset.fontFamily,
        fontWeight: '700',
        paintFirst: 'stroke',
        shadow: new Shadow({
          color: DEFAULT_TEXT_SHADOW.color,
          blur: DEFAULT_TEXT_SHADOW.blur,
          offsetX: DEFAULT_TEXT_SHADOW.offsetX,
          offsetY: DEFAULT_TEXT_SHADOW.offsetY,
        }),
      })

      const layer = ensureLayerMeta(text)
      layer.layerId = createLayerId()
      layer.layerType = 'text'
      layer.layerName = createDefaultLayerName('text', text)
      canvas.add(text)
      canvas.setActiveObject(text)
      canvas.requestRenderAll()
      syncFromCanvas()
      return true
    },
    [canvas, canvasSize, syncFromCanvas],
  )

  return {
    hasTextTarget,
    style,
    applyStylePatch,
    applyPreset,
    syncFromCanvas,
  }
}
