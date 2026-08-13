import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { ensureEditorSchema } from '@/lib/editor-schema'

/** Frame Pick 로컬 DB 이름 */
export const EDITOR_DB_NAME = 'frame-pick'

interface EditorDbInitOptions {
  debug?: boolean
  wasmUri?: string
  workerUri?: string
}

let dbPromise: Promise<EasySqlite> | null = null

/**
 * 브라우저에서만 EasySqlite 인스턴스를 초기화한다. (IndexedDB 백업)
 * @param {EditorDbInitOptions} [options] - 추가 설정
 * @returns {Promise<EasySqlite>} - DB 인스턴스
 */
export async function getEditorDb(options: EditorDbInitOptions = {}): Promise<EasySqlite> {
  if (typeof window === 'undefined') {
    throw new Error('getEditorDb는 브라우저에서만 호출할 수 있습니다.')
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const { initEasySqlite } = await import('@h_domi/domi-indexed-sqlite')
      const db = await initEasySqlite({
        dbName: EDITOR_DB_NAME,
        storageType: 'indexeddb',
        ...options,
      })
      await ensureEditorSchema(db)
      return db
    })().catch((error) => {
      dbPromise = null
      throw error
    })
  }

  return dbPromise
}
