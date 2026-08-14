import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { DEFAULT_CANVAS_SIZE_ID, type CanvasSizeId } from '@/lib/canvas-size'
import {
  DEFAULT_PAGE_ID,
  DEFAULT_PAGE_NAME,
  DEFAULT_PROJECT_ID,
  WORKSPACE_ROW_ID,
} from '@/lib/editor-persist-constants'

export interface WorkspacePointer {
  projectId: string
  pageId: string
}

export interface ProjectRow {
  id: string
  name: string
  updatedAt: number
}

export interface PageRow {
  id: string
  projectId: string
  name: string
  sortOrder: number
  sizeId: CanvasSizeId
  canvasJson: string
  updatedAt: number
}

/**
 * 프로젝트/페이지 ID를 생성한다.
 * @param {string} prefix
 * @returns {string}
 */
export function createEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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
 * 활성 프로젝트/페이지 포인터를 갱신한다.
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
 * pages 행의 canvas_json을 동기화한다.
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

/**
 * 프로젝트 목록을 조회한다.
 * @param {EasySqlite} db
 * @returns {Promise<ProjectRow[]>}
 */
export async function listProjects(db: EasySqlite): Promise<ProjectRow[]> {
  const rows = await db.query<{
    id: string
    name: string
    updated_at: number
  }>(
    `
      SELECT id, name, updated_at
      FROM projects
      WHERE deleted = 0
      ORDER BY updated_at DESC
    `,
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
  }))
}

/**
 * 프로젝트의 페이지 목록을 조회한다.
 * @param {EasySqlite} db
 * @param {string} projectId
 * @returns {Promise<PageRow[]>}
 */
export async function listPages(db: EasySqlite, projectId: string): Promise<PageRow[]> {
  const rows = await db.query<{
    id: string
    project_id: string
    name: string
    sort_order: number
    size_id: string
    canvas_json: string
    updated_at: number
  }>(
    `
      SELECT id, project_id, name, sort_order, size_id, canvas_json, updated_at
      FROM pages
      WHERE project_id = ? AND deleted = 0
      ORDER BY sort_order ASC, created_at ASC
    `,
    [projectId],
  )
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sortOrder: row.sort_order,
    sizeId: (row.size_id || DEFAULT_CANVAS_SIZE_ID) as CanvasSizeId,
    canvasJson: row.canvas_json || '',
    updatedAt: row.updated_at,
  }))
}

/**
 * 페이지 한 건을 조회한다.
 * @param {EasySqlite} db
 * @param {string} pageId
 * @returns {Promise<PageRow | null>}
 */
export async function getPage(db: EasySqlite, pageId: string): Promise<PageRow | null> {
  const rows = await db.query<{
    id: string
    project_id: string
    name: string
    sort_order: number
    size_id: string
    canvas_json: string
    updated_at: number
  }>(
    `
      SELECT id, project_id, name, sort_order, size_id, canvas_json, updated_at
      FROM pages
      WHERE id = ? AND deleted = 0
      LIMIT 1
    `,
    [pageId],
  )
  const row = rows[0]
  if (!row) {
    return null
  }
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sortOrder: row.sort_order,
    sizeId: (row.size_id || DEFAULT_CANVAS_SIZE_ID) as CanvasSizeId,
    canvasJson: row.canvas_json || '',
    updatedAt: row.updated_at,
  }
}

/**
 * 프로젝트를 생성하고 기본 페이지를 붙인다.
 * @param {EasySqlite} db
 * @param {string} [name]
 * @returns {Promise<{ project: ProjectRow; page: PageRow }>}
 */
export async function createProject(
  db: EasySqlite,
  name?: string,
): Promise<{ project: ProjectRow; page: PageRow }> {
  const now = Date.now()
  const projectId = createEntityId('project')
  const pageId = createEntityId('page')
  const projectName = (name?.trim() || `프로젝트 ${new Date().toLocaleDateString('ko-KR')}`).slice(
    0,
    40,
  )
  const pageName = DEFAULT_PAGE_NAME

  await db.execute(
    `
      INSERT INTO projects (id, name, created_at, updated_at, deleted)
      VALUES (?, ?, ?, ?, 0)
    `,
    [projectId, projectName, now, now],
  )
  await db.execute(
    `
      INSERT INTO pages (
        id, project_id, name, sort_order, size_id, canvas_json,
        created_at, updated_at, deleted
      ) VALUES (?, ?, ?, 0, ?, '', ?, ?, 0)
    `,
    [pageId, projectId, pageName, DEFAULT_CANVAS_SIZE_ID, now, now],
  )

  return {
    project: { id: projectId, name: projectName, updatedAt: now },
    page: {
      id: pageId,
      projectId,
      name: pageName,
      sortOrder: 0,
      sizeId: DEFAULT_CANVAS_SIZE_ID,
      canvasJson: '',
      updatedAt: now,
    },
  }
}

/**
 * 페이지를 추가한다.
 * @param {EasySqlite} db
 * @param {string} projectId
 * @param {string} [name]
 * @returns {Promise<PageRow>}
 */
export async function createPage(
  db: EasySqlite,
  projectId: string,
  name?: string,
): Promise<PageRow> {
  const now = Date.now()
  const pageId = createEntityId('page')
  const countRows = await db.query<{ count: number }>(
    'SELECT COUNT(*) as count FROM pages WHERE project_id = ? AND deleted = 0',
    [projectId],
  )
  const sortOrder = countRows[0]?.count ?? 0
  const pageName = (name?.trim() || `페이지 ${sortOrder + 1}`).slice(0, 40)

  await db.execute(
    `
      INSERT INTO pages (
        id, project_id, name, sort_order, size_id, canvas_json,
        created_at, updated_at, deleted
      ) VALUES (?, ?, ?, ?, ?, '', ?, ?, 0)
    `,
    [pageId, projectId, pageName, sortOrder, DEFAULT_CANVAS_SIZE_ID, now, now],
  )
  await db.execute('UPDATE projects SET updated_at = ? WHERE id = ?', [now, projectId])

  return {
    id: pageId,
    projectId,
    name: pageName,
    sortOrder,
    sizeId: DEFAULT_CANVAS_SIZE_ID,
    canvasJson: '',
    updatedAt: now,
  }
}

/**
 * 프로젝트 이름을 바꾼다.
 * @param {EasySqlite} db
 * @param {string} projectId
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function renameProject(
  db: EasySqlite,
  projectId: string,
  name: string,
): Promise<void> {
  const next = name.trim().slice(0, 40)
  if (!next) {
    return
  }
  await db.execute('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?', [
    next,
    Date.now(),
    projectId,
  ])
}

/**
 * 페이지 이름을 바꾼다.
 * @param {EasySqlite} db
 * @param {string} pageId
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function renamePage(db: EasySqlite, pageId: string, name: string): Promise<void> {
  const next = name.trim().slice(0, 40)
  if (!next) {
    return
  }
  await db.execute('UPDATE pages SET name = ?, updated_at = ? WHERE id = ?', [
    next,
    Date.now(),
    pageId,
  ])
}

/**
 * 페이지를 소프트 삭제한다. 마지막 1개는 삭제하지 않는다.
 * @param {EasySqlite} db
 * @param {string} pageId
 * @returns {Promise<boolean>} - 삭제 성공 여부
 */
export async function softDeletePage(db: EasySqlite, pageId: string): Promise<boolean> {
  const page = await getPage(db, pageId)
  if (!page) {
    return false
  }
  const siblings = await listPages(db, page.projectId)
  if (siblings.length <= 1) {
    return false
  }
  await db.execute('UPDATE pages SET deleted = 1, updated_at = ? WHERE id = ?', [
    Date.now(),
    pageId,
  ])
  return true
}

/**
 * 프로젝트를 소프트 삭제한다. 마지막 1개는 삭제하지 않는다.
 * @param {EasySqlite} db
 * @param {string} projectId
 * @returns {Promise<boolean>}
 */
export async function softDeleteProject(db: EasySqlite, projectId: string): Promise<boolean> {
  const projects = await listProjects(db)
  if (projects.length <= 1) {
    return false
  }
  const now = Date.now()
  await db.execute('UPDATE projects SET deleted = 1, updated_at = ? WHERE id = ?', [
    now,
    projectId,
  ])
  await db.execute('UPDATE pages SET deleted = 1, updated_at = ? WHERE project_id = ?', [
    now,
    projectId,
  ])
  return true
}
