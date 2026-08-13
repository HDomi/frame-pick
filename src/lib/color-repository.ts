import type { EasySqlite } from '@h_domi/domi-indexed-sqlite'
import { RECENT_COLORS_MAX } from '@/lib/ui-constants'

interface ColorRecentRow {
  hex: string
  used_at: number
}

export type ParsedHexColor = {
  /** #rrggbb */
  rgb: string
  /** 0~1 */
  alpha: number
  /** #rrggbb 또는 #rrggbbaa (alpha&lt;1일 때 8자리) */
  hex: string
}

/**
 * 0~1 알파를 클램프한다.
 * @param {number} value
 * @returns {number}
 */
export function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.min(1, Math.max(0, value))
}

/**
 * #RRGGBB + alpha → #RRGGBB 또는 #RRGGBBAA
 * @param {string} rgb - #rrggbb
 * @param {number} [alpha=1]
 * @param {{ forceAlpha?: boolean }} [options]
 * @returns {string}
 */
export function formatHexColor(
  rgb: string,
  alpha = 1,
  options?: { forceAlpha?: boolean },
): string {
  const base = normalizeHexColorRgb(rgb) ?? '#ffffff'
  const a = clampAlpha(alpha)
  const alphaByte = Math.round(a * 255)
  const aa = alphaByte.toString(16).padStart(2, '0')
  if (alphaByte === 255 && !options?.forceAlpha) {
    return base
  }
  return `${base}${aa}`
}

/**
 * #RRGGBB만 정규화한다 (알파는 버림).
 * @param {string} value
 * @returns {string | null}
 */
function normalizeHexColorRgb(value: string): string | null {
  const trimmed = value.trim()
  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed)
  if (short) {
    const [r, g, b] = short[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const full = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(trimmed)
  if (full) {
    return `#${full[1]}`.toLowerCase()
  }
  const shortAlpha = /^#([0-9a-fA-F]{4})$/.exec(trimmed)
  if (shortAlpha) {
    const [r, g, b] = shortAlpha[1].slice(0, 3).split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return null
}

/**
 * hex/#rgba/rgba 문자열을 파싱한다.
 * @param {string} value
 * @returns {ParsedHexColor | null}
 */
export function parseHexColor(value: string): ParsedHexColor | null {
  const trimmed = value.trim()

  const short = /^#([0-9a-fA-F]{3})$/.exec(trimmed)
  if (short) {
    const [r, g, b] = short[1].split('')
    const rgb = `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    return { rgb, alpha: 1, hex: rgb }
  }

  const shortAlpha = /^#([0-9a-fA-F]{4})$/.exec(trimmed)
  if (shortAlpha) {
    const raw = shortAlpha[1]
    const [r, g, b, a] = raw.split('')
    const rgb = `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    const alpha = clampAlpha(Number.parseInt(`${a}${a}`, 16) / 255)
    return { rgb, alpha, hex: formatHexColor(rgb, alpha) }
  }

  const full = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(trimmed)
  if (full) {
    const rgb = `#${full[1]}`.toLowerCase()
    const alpha =
      full[2] != null ? clampAlpha(Number.parseInt(full[2], 16) / 255) : 1
    return { rgb, alpha, hex: formatHexColor(rgb, alpha) }
  }

  const rgba =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(
      trimmed,
    )
  if (rgba) {
    const toHex = (n: number) =>
      Math.round(Math.min(255, Math.max(0, n)))
        .toString(16)
        .padStart(2, '0')
    const rgb = `#${toHex(Number(rgba[1]))}${toHex(Number(rgba[2]))}${toHex(Number(rgba[3]))}`
    const alpha = rgba[4] != null ? clampAlpha(Number.parseFloat(rgba[4])) : 1
    return { rgb, alpha, hex: formatHexColor(rgb, alpha) }
  }

  if (trimmed === 'transparent') {
    return { rgb: '#000000', alpha: 0, hex: '#00000000' }
  }

  return null
}

/**
 * #RRGGBB 또는 #RRGGBBAA로 정규화한다. (투명 지원)
 * @param {string} value - 입력 색상
 * @returns {string | null} - 정규화된 hex
 */
export function normalizeHexColor(value: string): string | null {
  return parseHexColor(value)?.hex ?? null
}

/**
 * CSS background/color용 문자열 (rgba)
 * @param {string} value
 * @returns {string}
 */
export function hexToCssColor(value: string): string {
  const parsed = parseHexColor(value)
  if (!parsed) {
    return value
  }
  const r = Number.parseInt(parsed.rgb.slice(1, 3), 16)
  const g = Number.parseInt(parsed.rgb.slice(3, 5), 16)
  const b = Number.parseInt(parsed.rgb.slice(5, 7), 16)
  if (parsed.alpha >= 1) {
    return parsed.rgb
  }
  return `rgba(${r}, ${g}, ${b}, ${parsed.alpha})`
}

/**
 * Fabric fill/stroke용 색 문자열
 * @param {string} value
 * @returns {string}
 */
export function colorToFabricColor(value: string): string {
  return hexToCssColor(value)
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
 * @param {string} hexInput - 색상 (#RRGGBB / #RRGGBBAA)
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
