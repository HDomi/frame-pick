'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import {
  DEFAULT_BACKGROUND_FILL,
  ensureBackgroundLayer,
  getBackgroundFill,
  setBackgroundFill,
} from '@/lib/background-layer'

/**
 * 잠긴 배경 레이어 확보·색상 변경 훅
 * @returns 배경 색상 API
 */
export function useBackgroundLayer() {
  const { canvas, isReady, canvasSizeId } = useCanvas()
  const [fill, setFill] = useState(DEFAULT_BACKGROUND_FILL)

  /**
   * 배경이 항상 존재하도록 보정하고 색상 state를 동기화한다.
   * @returns {void}
   */
  const syncFromCanvas = useCallback(() => {
    if (!canvas) {
      setFill(DEFAULT_BACKGROUND_FILL)
      return
    }
    ensureBackgroundLayer(canvas)
    setFill(getBackgroundFill(canvas))
  }, [canvas])

  useEffect(() => {
    if (!canvas || !isReady) {
      return
    }
    syncFromCanvas()
  }, [canvas, canvasSizeId, isReady, syncFromCanvas])

  useEffect(() => {
    if (!canvas) {
      return
    }

    const handleSync = () => {
      setFill(getBackgroundFill(canvas))
    }

    canvas.on('object:modified', handleSync)
    canvas.on('object:added', handleSync)
    return () => {
      canvas.off('object:modified', handleSync)
      canvas.off('object:added', handleSync)
    }
  }, [canvas])

  /**
   * 배경 색상을 변경한다.
   * @param {string} hex - 선택 색상
   * @returns {void}
   */
  const applyFill = useCallback(
    (hex: string) => {
      if (!canvas) {
        return
      }
      setBackgroundFill(canvas, hex)
      setFill(hex)
    },
    [canvas],
  )

  return {
    fill,
    isReady,
    applyFill,
    ensureBackground: syncFromCanvas,
  }
}
