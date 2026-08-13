import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { RECENT_COLORS_MAX } from '@/lib/ui-constants'

interface ColorRecentRow {
  hex: string
  used_at: number
}

/**
 * #RRGGBB 형식으로 정규화한다.
 * @param {string} value - 입력 색상
 * @returns {string | null} - 정규화된 hex
 */
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed)
  if (short) {
    const [r, g, b] = short[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(trimmed)
  if (full) {
    return `#${full[1]}`.toLowerCase()
  }
  return null
}

/**
 * 최근 색상 목록을 조회한다.
 * @param {EasySqlite} db - DB
 * @returns {Promise<string[]>} - hex 배열 (최신순)
 */
export async function listRecentColors(db: EasySqlite): Promise<string[]> {
  const rows = await db.query<ColorRecentRow>(
    'SELECT hex, used_at FROM color_recents ORDER BY used_at DESC LIMIT ?',
    [RECENT_COLORS_MAX],
  )
  return rows.map((row) => row.hex)
}

/**
 * 최근 색상에 hex를 추가(또는 갱신)한다.
 * @param {EasySqlite} db - DB
 * @param {string} hexInput - 색상
 * @returns {Promise<string[]>} - 갱신된 최근 색상
 */
export async function pushRecentColor(db: EasySqlite, hexInput: string): Promise<string[]> {
  const hex = normalizeHexColor(hexInput)
  if (!hex) {
    return listRecentColors(db)
  }

  await db.execute(
    `
      INSERT INTO color_recents (hex, used_at)
      VALUES (?, ?)
      ON CONFLICT(hex) DO UPDATE SET used_at = excluded.used_at
    `,
    [hex, Date.now()],
  )

  const rows = await db.query<ColorRecentRow>(
    'SELECT hex FROM color_recents ORDER BY used_at DESC',
  )
  if (rows.length > RECENT_COLORS_MAX) {
    const overflow = rows.slice(RECENT_COLORS_MAX)
    for (const row of overflow) {
      await db.execute('DELETE FROM color_recents WHERE hex = ?', [row.hex])
    }
  }

  return listRecentColors(db)
}
