'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { getEditorDb } from '@/lib/editor-db'

/**
 * Frame Pick 로컬 SQLite(IndexedDB) 접근 훅
 * @returns {{ db: EasySqlite | null; isReady: boolean; error: Error | null; ensureDb: () => Promise<EasySqlite> }}
 */
export function useEditorDb() {
  const [db, setDb] = useState<EasySqlite | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * DB를 보장하고 인스턴스를 반환한다.
   * @returns {Promise<EasySqlite>} - DB 인스턴스
   */
  const ensureDb = useCallback(async () => {
    const instance = await getEditorDb()
    setDb(instance)
    setIsReady(true)
    setError(null)
    return instance
  }, [])

  useEffect(() => {
    let cancelled = false

    ensureDb().catch((err: unknown) => {
      if (cancelled) {
        return
      }
      setError(err instanceof Error ? err : new Error(String(err)))
      setIsReady(false)
    })

    return () => {
      cancelled = true
    }
  }, [ensureDb])

  return {
    db,
    isReady,
    error,
    ensureDb,
  }
}
