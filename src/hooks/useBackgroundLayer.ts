'use client'

import { useCallback, useEffect, useState } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import {
  DEFAULT_BACKGROUND_FILL,
  ensureBackgroundLayer,
  getBackgroundFillValue,
  setBackgroundFill,
} from '@/lib/background-layer'
import { createSolidFill, type FillValue } from '@/lib/fill-value'

/**
 * 잠긴 배경 레이어 확보·채움 변경 훅
 * @returns 배경 채움 API
 */
export function useBackgroundLayer() {
  const { canvas, isReady, canvasSizeId } = useCanvas()
  const [fill, setFill] = useState<FillValue>(createSolidFill(DEFAULT_BACKGROUND_FILL))

  /**
   * 배경이 항상 존재하도록 보정하고 채움 state를 동기화한다.
   * @returns {void}
   */
  const syncFromCanvas = useCallback(() => {
    if (!canvas) {
      setFill(createSolidFill(DEFAULT_BACKGROUND_FILL))
      return
    }
    ensureBackgroundLayer(canvas)
    setFill(getBackgroundFillValue(canvas))
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
      setFill(getBackgroundFillValue(canvas))
    }

    canvas.on('object:modified', handleSync)
    canvas.on('object:added', handleSync)
    return () => {
      canvas.off('object:modified', handleSync)
      canvas.off('object:added', handleSync)
    }
  }, [canvas])

  /**
   * 배경 채움을 변경한다.
   * @param {FillValue} next
   * @returns {void}
   */
  const applyFill = useCallback(
    (next: FillValue) => {
      if (!canvas) {
        return
      }
      setBackgroundFill(canvas, next)
      setFill(next)
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
