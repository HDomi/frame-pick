import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'

/**
 * document.fonts용 단일 패밀리명 (따옴표·폴백 제거)
 * @param {string} fontFamily - font-family CSS 값
 * @returns {string} - 첫 번째 패밀리명
 */
export function getPrimaryFontFamily(fontFamily: string): string {
  return fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') ?? fontFamily
}

/**
 * 에디터용 웹폰트 로드를 보장한다.
 * @param {string} [fontFamily] - 로드할 폰트 패밀리 CSS 값
 * @returns {Promise<boolean>} - 로드 성공 여부
 */
export async function ensureEditorFontLoaded(
  fontFamily: string = EDITOR_FONT_FAMILY,
): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) {
    return false
  }

  const primary = getPrimaryFontFamily(fontFamily)

  try {
    await document.fonts.load(`700 64px "${primary}"`)
    return document.fonts.check(`700 64px "${primary}"`)
  } catch {
    return false
  }
}
