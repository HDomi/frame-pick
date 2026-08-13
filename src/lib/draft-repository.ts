import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import type { CanvasSizeId } from '@/lib/canvas-size'
import type { EditorSnapshot } from '@/lib/canvas-snapshot'
import { DRAFT_ROW_ID } from '@/lib/editor-persist-constants'
import { getWorkspacePointer, syncPageCanvas } from '@/lib/project-repository'

interface DraftRow {
  id: string
  size_id: string
  canvas_json: string
  updated_at: number
  project_id?: string | null
  page_id?: string | null
}

/**
 * 현재 드래프트를 저장한다. (workspace page와 pages 테이블도 동기화)
 * @param {EasySqlite} db - DB
 * @param {EditorSnapshot} snapshot - 스냅샷
 * @returns {Promise<number>} - 저장 시각(ms)
 */
export async function saveDraft(
  db: EasySqlite,
  snapshot: EditorSnapshot,
): Promise<number> {
  const updatedAt = Date.now()
  const workspace = await getWorkspacePointer(db)

  await db.execute(
    `
      INSERT INTO drafts (id, size_id, canvas_json, updated_at, project_id, page_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        size_id = excluded.size_id,
        canvas_json = excluded.canvas_json,
        updated_at = excluded.updated_at,
        project_id = excluded.project_id,
        page_id = excluded.page_id
    `,
    [
      DRAFT_ROW_ID,
      snapshot.sizeId,
      snapshot.canvasJson,
      updatedAt,
      workspace.projectId,
      workspace.pageId,
    ],
  )

  await syncPageCanvas(db, workspace.pageId, snapshot.sizeId, snapshot.canvasJson)
  return updatedAt
}

/**
 * 저장된 드래프트를 불러온다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<(EditorSnapshot & { updatedAt: number }) | null>}
 */
export async function loadDraft(
  db: EasySqlite,
): Promise<(EditorSnapshot & { updatedAt: number }) | null> {
  const rows = await db.query<DraftRow>('SELECT * FROM drafts WHERE id = ? LIMIT 1', [
    DRAFT_ROW_ID,
  ])
  const row = rows[0]
  if (!row) {
    return null
  }

  return {
    sizeId: row.size_id as CanvasSizeId,
    canvasJson: row.canvas_json,
    updatedAt: row.updated_at,
  }
}

/**
 * 드래프트를 삭제한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<void>}
 */
export async function clearDraft(db: EasySqlite): Promise<void> {
  await db.execute('DELETE FROM drafts WHERE id = ?', [DRAFT_ROW_ID])
}
