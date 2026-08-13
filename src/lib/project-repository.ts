import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import {
  DEFAULT_PAGE_ID,
  DEFAULT_PROJECT_ID,
  WORKSPACE_ROW_ID,
} from '@/lib/editor-persist-constants'

export interface WorkspacePointer {
  projectId: string
  pageId: string
}

/**
 * 현재 활성 프로젝트/페이지 포인터를 읽는다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<WorkspacePointer>}
 */
export async function getWorkspacePointer(db: EasySqlite): Promise<WorkspacePointer> {
  const rows = await db.query<{ project_id: string | null; page_id: string | null }>(
    'SELECT project_id, page_id FROM workspace_state WHERE id = ? LIMIT 1',
    [WORKSPACE_ROW_ID],
  )
  const row = rows[0]
  return {
    projectId: row?.project_id || DEFAULT_PROJECT_ID,
    pageId: row?.page_id || DEFAULT_PAGE_ID,
  }
}

/**
 * 활성 프로젝트/페이지 포인터를 갱신한다. (다중 프로젝트 UI용)
 * @param {EasySqlite} db - DB
 * @param {WorkspacePointer} pointer - 포인터
 * @returns {Promise<void>}
 */
export async function setWorkspacePointer(
  db: EasySqlite,
  pointer: WorkspacePointer,
): Promise<void> {
  await db.execute(
    `
      INSERT INTO workspace_state (id, project_id, page_id, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        page_id = excluded.page_id,
        updated_at = excluded.updated_at
    `,
    [WORKSPACE_ROW_ID, pointer.projectId, pointer.pageId, Date.now()],
  )
}

/**
 * pages 행의 canvas_json을 동기화한다. (드래프트 저장 시 선행 설계)
 * @param {EasySqlite} db - DB
 * @param {string} pageId - 페이지 ID
 * @param {string} sizeId - 해상도 ID
 * @param {string} canvasJson - 캔버스 JSON
 * @returns {Promise<void>}
 */
export async function syncPageCanvas(
  db: EasySqlite,
  pageId: string,
  sizeId: string,
  canvasJson: string,
): Promise<void> {
  await db.execute(
    `
      UPDATE pages
      SET size_id = ?, canvas_json = ?, updated_at = ?
      WHERE id = ?
    `,
    [sizeId, canvasJson, Date.now(), pageId],
  )
}
