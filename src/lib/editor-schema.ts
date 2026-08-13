import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { DEFAULT_CANVAS_SIZE_ID } from '@/lib/canvas-size'
import {
  DEFAULT_PAGE_ID,
  DEFAULT_PAGE_NAME,
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_NAME,
  WORKSPACE_ROW_ID,
} from '@/lib/editor-persist-constants'

/**
 * 테이블에 컬럼이 없으면 추가한다.
 * @param {EasySqlite} db - DB
 * @param {string} table - 테이블명
 * @param {string} column - 컬럼명
 * @param {string} definition - 컬럼 정의 (예: TEXT)
 * @returns {Promise<void>}
 */
async function ensureColumn(
  db: EasySqlite,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const rows = await db.query<{ name: string }>(`PRAGMA table_info(${table})`)
  if (rows.some((row) => row.name === column)) {
    return
  }
  await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

/**
 * 기본 프로젝트·페이지·워크스페이스를 시드한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<void>}
 */
async function seedDefaultWorkspace(db: EasySqlite): Promise<void> {
  const now = Date.now()

  const projects = await db.query<{ id: string }>(
    'SELECT id FROM projects WHERE id = ? LIMIT 1',
    [DEFAULT_PROJECT_ID],
  )
  if (projects.length === 0) {
    await db.execute(
      `
        INSERT INTO projects (id, name, created_at, updated_at, deleted)
        VALUES (?, ?, ?, ?, 0)
      `,
      [DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME, now, now],
    )
  }

  const pages = await db.query<{ id: string }>(
    'SELECT id FROM pages WHERE id = ? LIMIT 1',
    [DEFAULT_PAGE_ID],
  )
  if (pages.length === 0) {
    await db.execute(
      `
        INSERT INTO pages (
          id, project_id, name, sort_order, size_id, canvas_json,
          created_at, updated_at, deleted
        ) VALUES (?, ?, ?, 0, ?, '', ?, ?, 0)
      `,
      [DEFAULT_PAGE_ID, DEFAULT_PROJECT_ID, DEFAULT_PAGE_NAME, DEFAULT_CANVAS_SIZE_ID, now, now],
    )
  }

  const workspace = await db.query<{ id: string }>(
    'SELECT id FROM workspace_state WHERE id = ? LIMIT 1',
    [WORKSPACE_ROW_ID],
  )
  if (workspace.length === 0) {
    await db.execute(
      `
        INSERT INTO workspace_state (id, project_id, page_id, updated_at)
        VALUES (?, ?, ?, ?)
      `,
      [WORKSPACE_ROW_ID, DEFAULT_PROJECT_ID, DEFAULT_PAGE_ID, now],
    )
  }
}

/**
 * 에디터용 drafts / history / projects / pages 스키마를 생성·마이그레이션한다.
 * @param {EasySqlite} db - DB 인스턴스
 * @returns {Promise<void>}
 */
export async function ensureEditorSchema(db: EasySqlite): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      size_id TEXT NOT NULL,
      canvas_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      page_id TEXT,
      updated_at INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      size_id TEXT NOT NULL,
      canvas_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await ensureColumn(db, 'drafts', 'project_id', 'TEXT')
  await ensureColumn(db, 'drafts', 'page_id', 'TEXT')

  await db.execute(`
    CREATE TABLE IF NOT EXISTS history_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cursor_id INTEGER
    )
  `)

  await ensureColumn(db, 'history_meta', 'page_id', 'TEXT')

  await db.execute(`
    CREATE TABLE IF NOT EXISTS history_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      size_id TEXT NOT NULL,
      canvas_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  await ensureColumn(db, 'history_steps', 'page_id', 'TEXT')
  await ensureColumn(db, 'history_steps', 'label', 'TEXT')
  await ensureColumn(db, 'history_steps', 'command_type', 'TEXT')

  const meta = await db.query<{ id: number }>('SELECT id FROM history_meta WHERE id = 1')
  if (meta.length === 0) {
    await db.execute(
      'INSERT INTO history_meta (id, cursor_id, page_id) VALUES (1, NULL, ?)',
      [DEFAULT_PAGE_ID],
    )
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS color_recents (
      hex TEXT PRIMARY KEY,
      used_at INTEGER NOT NULL
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ui_prefs (
      id TEXT PRIMARY KEY,
      left_panel_pct REAL NOT NULL,
      right_panel_pct REAL NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await seedDefaultWorkspace(db)

  // 기존 drafts/history에 page 스코프가 없으면 기본 페이지로 백필
  await db.execute(
    `UPDATE drafts SET project_id = COALESCE(project_id, ?), page_id = COALESCE(page_id, ?)`,
    [DEFAULT_PROJECT_ID, DEFAULT_PAGE_ID],
  )
  await db.execute(`UPDATE history_steps SET page_id = COALESCE(page_id, ?)`, [DEFAULT_PAGE_ID])
  await db.execute(`UPDATE history_meta SET page_id = COALESCE(page_id, ?) WHERE id = 1`, [
    DEFAULT_PAGE_ID,
  ])
}
