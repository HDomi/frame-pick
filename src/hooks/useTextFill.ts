'use client'

import { useCallback, useEffect, useState } from 'react'
import { IText, Textbox, type FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { normalizeHexColor } from '@/lib/color-repository'

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
 * 활성 텍스트의 채움색/부분 선택 색상 훅
 * @returns 텍스트 색상 API
 */
export function useTextFill() {
  const { canvas } = useCanvas()
  const [fill, setFill] = useState('#ffffff')
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
      const firstFill = styles.find((style) => typeof style.fill === 'string')?.fill
      const next = normalizeHexColor(String(firstFill ?? active.fill ?? '#ffffff'))
      setFill(next ?? '#ffffff')
      return
    }

    const next = normalizeHexColor(String(active.fill ?? '#ffffff'))
    setFill(next ?? '#ffffff')
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
   * 선택 글자 또는 전체 텍스트 색상을 변경한다.
   * @param {string} hexInput - 색상
   * @returns {boolean} - 적용 성공 여부
   */
  const applyFill = useCallback(
    (hexInput: string) => {
      if (!canvas) {
        return false
      }
      const hex = normalizeHexColor(hexInput)
      if (!hex) {
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

      if (selectionActive) {
        active.setSelectionStyles(
          { fill: hex },
          active.selectionStart,
          active.selectionEnd,
        )
      } else {
        active.set('fill', hex)
        // 부분 스타일이 남아 전체를 덮는 경우 초기화 후 통일
        if (active.styles && Object.keys(active.styles).length > 0) {
          const len = active.text?.length ?? 0
          if (len > 0) {
            active.setSelectionStyles({ fill: hex }, 0, len)
          }
        }
      }

      active.set('dirty', true)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      setFill(hex)
      setHasSelection(selectionActive)
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
