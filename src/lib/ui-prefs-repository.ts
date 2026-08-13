import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import {
  DEFAULT_LEFT_PANEL_PCT,
  DEFAULT_RIGHT_PANEL_PCT,
  UI_LAYOUT_PREF_ID,
} from '@/lib/ui-constants'

export interface PanelLayoutPrefs {
  leftPanelPct: number
  rightPanelPct: number
}

interface UiPrefsRow {
  id: string
  left_panel_pct: number
  right_panel_pct: number
  updated_at: number
}

/**
 * 패널 레이아웃 기본값을 반환한다.
 * @returns {PanelLayoutPrefs}
 */
export function getDefaultPanelLayout(): PanelLayoutPrefs {
  return {
    leftPanelPct: DEFAULT_LEFT_PANEL_PCT,
    rightPanelPct: DEFAULT_RIGHT_PANEL_PCT,
  }
}

/**
 * 저장된 패널 레이아웃을 불러온다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<PanelLayoutPrefs>}
 */
export async function loadPanelLayout(db: EasySqlite): Promise<PanelLayoutPrefs> {
  const rows = await db.query<UiPrefsRow>('SELECT * FROM ui_prefs WHERE id = ? LIMIT 1', [
    UI_LAYOUT_PREF_ID,
  ])
  const row = rows[0]
  if (!row) {
    return getDefaultPanelLayout()
  }
  return {
    leftPanelPct: row.left_panel_pct,
    rightPanelPct: row.right_panel_pct,
  }
}

/**
 * 패널 레이아웃을 저장한다.
 * @param {EasySqlite} db - DB
 * @param {PanelLayoutPrefs} layout - 레이아웃
 * @returns {Promise<void>}
 */
export async function savePanelLayout(db: EasySqlite, layout: PanelLayoutPrefs): Promise<void> {
  await db.execute(
    `
      INSERT INTO ui_prefs (id, left_panel_pct, right_panel_pct, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        left_panel_pct = excluded.left_panel_pct,
        right_panel_pct = excluded.right_panel_pct,
        updated_at = excluded.updated_at
    `,
    [UI_LAYOUT_PREF_ID, layout.leftPanelPct, layout.rightPanelPct, Date.now()],
  )
}
