'use client'

import { useCallback, useEffect, useState } from 'react'
import { IText, Textbox, type FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import {
  createFabricFill,
  createSolidFill,
  parseFabricFill,
  type FillValue,
} from '@/lib/fill-value'

type TextObject = IText | Textbox

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
 * 활성 텍스트의 채움(단색/그라데이션)·부분 선택 훅
 * @returns 텍스트 채움 API
 */
export function useTextFill() {
  const { canvas } = useCanvas()
  const [fill, setFill] = useState<FillValue>(createSolidFill('#ffffff'))
  const [hasTextTarget, setHasTextTarget] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)

  /**
   * 현재 선택/객체 상태를 UI에 반영한다.
   * @returns {void}
   */
  const syncFromCanvas = useCallback(() => {
    if (!canvas) {
      setHasTextTarget(false)
      setHasSelection(false)
      return
    }

    const active = canvas.getActiveObject()
    if (!isTextObject(active)) {
      setHasTextTarget(false)
      setHasSelection(false)
      return
    }

    setHasTextTarget(true)
    const selectionActive =
      Boolean(active.isEditing) &&
      typeof active.selectionStart === 'number' &&
      typeof active.selectionEnd === 'number' &&
      active.selectionStart !== active.selectionEnd

    setHasSelection(selectionActive)

    if (selectionActive) {
      const styles = active.getSelectionStyles(active.selectionStart, active.selectionEnd, true)
      const firstFill = styles.find((style) => style.fill != null)?.fill
      setFill(parseFabricFill(firstFill ?? active.fill, '#ffffff'))
      return
    }

    setFill(parseFabricFill(active.fill, '#ffffff'))
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
    canvas.on('text:selection:changed', handleSync)
    canvas.on('text:editing:entered', handleSync)
    canvas.on('text:editing:exited', handleSync)

    syncFromCanvas()

    return () => {
      canvas.off('selection:created', handleSync)
      canvas.off('selection:updated', handleSync)
      canvas.off('selection:cleared', handleSync)
      canvas.off('object:modified', handleSync)
      canvas.off('text:selection:changed', handleSync)
      canvas.off('text:editing:entered', handleSync)
      canvas.off('text:editing:exited', handleSync)
    }
  }, [canvas, syncFromCanvas])

  /**
   * 선택 글자 또는 전체 텍스트 채움을 변경한다.
   * @param {FillValue} next - 단색/그라데이션
   * @returns {boolean}
   */
  const applyFill = useCallback(
    (next: FillValue) => {
      if (!canvas) {
        return false
      }

      const active = canvas.getActiveObject()
      if (!isTextObject(active)) {
        return false
      }

      const selectionActive =
        Boolean(active.isEditing) &&
        typeof active.selectionStart === 'number' &&
        typeof active.selectionEnd === 'number' &&
        active.selectionStart !== active.selectionEnd

      // 부분 선택은 단색만
      if (selectionActive) {
        const solid =
          next.mode === 'solid' ? next.color : next.mode === 'gradient' ? next.colorA : '#ffffff'
        active.setSelectionStyles(
          { fill: solid },
          active.selectionStart,
          active.selectionEnd,
        )
        active.set('dirty', true)
        canvas.requestRenderAll()
        canvas.fire('object:modified', { target: active })
        setFill(createSolidFill(solid))
        setHasSelection(true)
        return true
      }

      const fabricFill = createFabricFill(next)
      active.set('fill', fabricFill)

      // 부분 스타일 fill이 그라데이션을 덮지 않도록 제거
      if (next.mode === 'gradient' && active.styles) {
        for (const lineKey of Object.keys(active.styles)) {
          const line = active.styles[Number(lineKey)]
          if (!line) {
            continue
          }
          for (const charKey of Object.keys(line)) {
            const style = line[Number(charKey)]
            if (style && 'fill' in style) {
              delete style.fill
            }
          }
        }
      } else if (active.styles && Object.keys(active.styles).length > 0) {
        const len = active.text?.length ?? 0
        if (len > 0 && next.mode === 'solid') {
          active.setSelectionStyles({ fill: next.color }, 0, len)
        }
      }

      active.set('dirty', true)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      setFill(next)
      setHasSelection(false)
      return true
    },
    [canvas],
  )

  return {
    fill,
    hasTextTarget,
    hasSelection,
    applyFill,
    syncFromCanvas,
  }
}
