'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEditorDb } from '@/hooks/useEditorDb'
import { listRecentColors, pushRecentColor } from '@/lib/color-repository'

/**
 * 최근 색상 목록 훅
 * @returns {{ recentColors: string[]; rememberColor: (hex: string) => Promise<void>; refresh: () => Promise<void> }}
 */
export function useRecentColors() {
  const { ensureDb, isReady } = useEditorDb()
  const [recentColors, setRecentColors] = useState<string[]>([])

  /**
   * 최근 색상을 다시 로드한다.
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async () => {
    const db = await ensureDb()
    const colors = await listRecentColors(db)
    setRecentColors(colors)
  }, [ensureDb])

  useEffect(() => {
    if (!isReady) {
      return
    }
    void refresh()
  }, [isReady, refresh])

  /**
   * 색상을 최근 목록에 기록한다.
   * @param {string} hex - 색상
   * @returns {Promise<void>}
   */
  const rememberColor = useCallback(
    async (hex: string) => {
      const db = await ensureDb()
      const colors = await pushRecentColor(db, hex)
      setRecentColors(colors)
    },
    [ensureDb],
  )

  return {
    recentColors,
    rememberColor,
    refresh,
  }
}
