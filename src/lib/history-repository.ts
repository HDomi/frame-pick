import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import type { CanvasSizeId } from '@/lib/canvas-size'
import type { EditorSnapshot } from '@/lib/canvas-snapshot'
import { HISTORY_MAX_STEPS } from '@/lib/editor-persist-constants'
import { getWorkspacePointer } from '@/lib/project-repository'

interface HistoryMetaRow {
  cursor_id: number | null
  page_id?: string | null
}

interface HistoryStepRow {
  id: number
  size_id: string
  canvas_json: string
  created_at: number
  page_id?: string | null
  label?: string | null
  command_type?: string | null
}

export interface HistoryPushOptions {
  label?: string
  commandType?: string
}

/**
 * 히스토리 커서를 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<number | null>}
 */
export async function getHistoryCursor(db: EasySqlite): Promise<number | null> {
  const rows = await db.query<HistoryMetaRow>(
    'SELECT cursor_id FROM history_meta WHERE id = 1 LIMIT 1',
  )
  return rows[0]?.cursor_id ?? null
}

/**
 * 히스토리 커서를 갱신한다.
 * @param {EasySqlite} db - DB
 * @param {number | null} cursorId - 커서 step id
 * @returns {Promise<void>}
 */
async function setHistoryCursor(db: EasySqlite, cursorId: number | null): Promise<void> {
  await db.execute('UPDATE history_meta SET cursor_id = ? WHERE id = 1', [cursorId])
}

/**
 * 현재 페이지 스코프의 히스토리를 비운다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<void>}
 */
export async function clearHistory(db: EasySqlite): Promise<void> {
  const workspace = await getWorkspacePointer(db)
  await db.execute('DELETE FROM history_steps WHERE page_id = ? OR page_id IS NULL', [
    workspace.pageId,
  ])
  await db.execute('UPDATE history_meta SET cursor_id = NULL, page_id = ? WHERE id = 1', [
    workspace.pageId,
  ])
}

/**
 * 스텝을 스냅샷으로 변환한다.
 * @param {HistoryStepRow} row - DB 행
 * @returns {EditorSnapshot & { id: number }}
 */
function toSnapshot(row: HistoryStepRow): EditorSnapshot & { id: number } {
  return {
    id: row.id,
    sizeId: row.size_id as CanvasSizeId,
    canvasJson: row.canvas_json,
  }
}

/**
 * 새 히스토리 스텝을 추가한다. (커서 이후 분기는 삭제, 최대 N개 유지, page 스코프)
 * @param {EasySqlite} db - DB
 * @param {EditorSnapshot} snapshot - 스냅샷
 * @param {HistoryPushOptions} [options] - 라벨/커맨드 메타 (추후 고도화)
 * @returns {Promise<number>} - 새 step id
 */
export async function pushHistoryStep(
  db: EasySqlite,
  snapshot: EditorSnapshot,
  options: HistoryPushOptions = {},
): Promise<number> {
  const workspace = await getWorkspacePointer(db)
  const cursorId = await getHistoryCursor(db)

  if (cursorId !== null) {
    await db.execute(
      'DELETE FROM history_steps WHERE id > ? AND (page_id = ? OR page_id IS NULL)',
      [cursorId, workspace.pageId],
    )
  }

  await db.execute(
    `
      INSERT INTO history_steps (size_id, canvas_json, created_at, page_id, label, command_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      snapshot.sizeId,
      snapshot.canvasJson,
      Date.now(),
      workspace.pageId,
      options.label ?? null,
      options.commandType ?? null,
    ],
  )

  const inserted = await db.query<{ id: number }>(
    'SELECT id FROM history_steps ORDER BY id DESC LIMIT 1',
  )
  const newId = inserted[0]?.id
  if (newId == null) {
    throw new Error('히스토리 스텝 생성에 실패했습니다.')
  }

  await setHistoryCursor(db, newId)
  await db.execute('UPDATE history_meta SET page_id = ? WHERE id = 1', [workspace.pageId])

  const countRows = await db.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM history_steps WHERE page_id = ?',
    [workspace.pageId],
  )
  let count = countRows[0]?.count ?? 0

  while (count > HISTORY_MAX_STEPS) {
    const oldest = await db.query<{ id: number }>(
      'SELECT id FROM history_steps WHERE page_id = ? ORDER BY id ASC LIMIT 1',
      [workspace.pageId],
    )
    const oldestId = oldest[0]?.id
    if (oldestId == null) {
      break
    }
    await db.execute('DELETE FROM history_steps WHERE id = ?', [oldestId])
    count -= 1
  }

  return newId
}

/**
 * 현재 커서 스텝을 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<(EditorSnapshot & { id: number }) | null>}
 */
export async function getCurrentHistoryStep(
  db: EasySqlite,
): Promise<(EditorSnapshot & { id: number }) | null> {
  const cursorId = await getHistoryCursor(db)
  if (cursorId == null) {
    return null
  }
  const rows = await db.query<HistoryStepRow>(
    'SELECT * FROM history_steps WHERE id = ? LIMIT 1',
    [cursorId],
  )
  return rows[0] ? toSnapshot(rows[0]) : null
}

/**
 * undo 가능 여부와 이전 스텝을 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<(EditorSnapshot & { id: number }) | null>}
 */
export async function getUndoStep(
  db: EasySqlite,
): Promise<(EditorSnapshot & { id: number }) | null> {
  const workspace = await getWorkspacePointer(db)
  const cursorId = await getHistoryCursor(db)
  if (cursorId == null) {
    return null
  }
  const rows = await db.query<HistoryStepRow>(
    `
      SELECT * FROM history_steps
      WHERE id < ? AND (page_id = ? OR page_id IS NULL)
      ORDER BY id DESC LIMIT 1
    `,
    [cursorId, workspace.pageId],
  )
  return rows[0] ? toSnapshot(rows[0]) : null
}

/**
 * redo 가능 여부와 다음 스텝을 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<(EditorSnapshot & { id: number }) | null>}
 */
export async function getRedoStep(
  db: EasySqlite,
): Promise<(EditorSnapshot & { id: number }) | null> {
  const workspace = await getWorkspacePointer(db)
  const cursorId = await getHistoryCursor(db)
  if (cursorId == null) {
    const first = await db.query<HistoryStepRow>(
      `
        SELECT * FROM history_steps
        WHERE page_id = ? OR page_id IS NULL
        ORDER BY id ASC LIMIT 1
      `,
      [workspace.pageId],
    )
    return first[0] ? toSnapshot(first[0]) : null
  }
  const rows = await db.query<HistoryStepRow>(
    `
      SELECT * FROM history_steps
      WHERE id > ? AND (page_id = ? OR page_id IS NULL)
      ORDER BY id ASC LIMIT 1
    `,
    [cursorId, workspace.pageId],
  )
  return rows[0] ? toSnapshot(rows[0]) : null
}

/**
 * 커서를 특정 스텝으로 이동한다.
 * @param {EasySqlite} db - DB
 * @param {number} stepId - step id
 * @returns {Promise<void>}
 */
export async function moveHistoryCursor(db: EasySqlite, stepId: number): Promise<void> {
  await setHistoryCursor(db, stepId)
}

/**
 * undo/redo 가능 상태를 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<{ canUndo: boolean; canRedo: boolean }>}
 */
export async function getHistoryFlags(
  db: EasySqlite,
): Promise<{ canUndo: boolean; canRedo: boolean }> {
  const [undo, redo] = await Promise.all([getUndoStep(db), getRedoStep(db)])
  return {
    canUndo: undo !== null,
    canRedo: redo !== null,
  }
}
