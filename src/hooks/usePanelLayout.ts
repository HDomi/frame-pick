'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorDb } from '@/hooks/useEditorDb'
import {
  CENTER_PANEL_MIN_PCT,
  LEFT_PANEL_MAX_PCT,
  LEFT_PANEL_MIN_PCT,
  RIGHT_PANEL_MAX_PCT,
  RIGHT_PANEL_MIN_PCT,
} from '@/lib/ui-constants'
import {
  getDefaultPanelLayout,
  loadPanelLayout,
  savePanelLayout,
  type PanelLayoutPrefs,
} from '@/lib/ui-prefs-repository'

/**
 * 좌/우 패널 % 너비 상태 + DB 저장 훅
 * @returns 패널 레이아웃 API
 */
export function usePanelLayout() {
  const { ensureDb, isReady } = useEditorDb()
  const [layout, setLayout] = useState<PanelLayoutPrefs>(getDefaultPanelLayout)
  const [isLoaded, setIsLoaded] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    if (!isReady) {
      return
    }

    let cancelled = false

    /**
     * DB에서 레이아웃을 복원한다.
     * @returns {Promise<void>}
     */
    const hydrate = async () => {
      const db = await ensureDb()
      const saved = await loadPanelLayout(db)
      if (cancelled) {
        return
      }
      setLayout(saved)
      setIsLoaded(true)
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [ensureDb, isReady])

  /**
   * 레이아웃을 디바운스 저장한다.
   * @param {PanelLayoutPrefs} next - 다음 레이아웃
   * @returns {void}
   */
  const persistLayout = useCallback(
    (next: PanelLayoutPrefs) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          const db = await ensureDb()
          await savePanelLayout(db, next)
        })()
      }, 300)
    },
    [ensureDb],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  /**
   * 좌측 패널을 픽셀 델타만큼 조절한다.
   * @param {number} deltaPx - 드래그 델타
   * @returns {void}
   */
  const resizeLeftByDelta = useCallback(
    (deltaPx: number) => {
      const shellWidth = shellRef.current?.clientWidth ?? 0
      if (shellWidth <= 0) {
        return
      }
      const deltaPct = (deltaPx / shellWidth) * 100
      setLayout((prev) => {
        const maxLeft = Math.min(
          LEFT_PANEL_MAX_PCT,
          100 - prev.rightPanelPct - CENTER_PANEL_MIN_PCT,
        )
        const nextLeft = Math.min(
          maxLeft,
          Math.max(LEFT_PANEL_MIN_PCT, prev.leftPanelPct + deltaPct),
        )
        const next = { ...prev, leftPanelPct: Number(nextLeft.toFixed(2)) }
        persistLayout(next)
        return next
      })
    },
    [persistLayout],
  )

  /**
   * 우측 패널을 픽셀 델타만큼 조절한다.
   * @param {number} deltaPx - 드래그 델타 (오른쪽 경계 기준: +는 오른쪽으로)
   * @returns {void}
   */
  const resizeRightByDelta = useCallback(
    (deltaPx: number) => {
      const shellWidth = shellRef.current?.clientWidth ?? 0
      if (shellWidth <= 0) {
        return
      }
      // 우측 핸들을 오른쪽으로 끌면 우측 패널이 줄어든다
      const deltaPct = (-deltaPx / shellWidth) * 100
      setLayout((prev) => {
        const maxRight = Math.min(
          RIGHT_PANEL_MAX_PCT,
          100 - prev.leftPanelPct - CENTER_PANEL_MIN_PCT,
        )
        const nextRight = Math.min(
          maxRight,
          Math.max(RIGHT_PANEL_MIN_PCT, prev.rightPanelPct + deltaPct),
        )
        const next = { ...prev, rightPanelPct: Number(nextRight.toFixed(2)) }
        persistLayout(next)
        return next
      })
    },
    [persistLayout],
  )

  return {
    shellRef,
    layout,
    isLoaded,
    resizeLeftByDelta,
    resizeRightByDelta,
  }
}
