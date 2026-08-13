/**
 * 에디터에 노출할 Google Fonts (~30종, 한글·썸네일용 라틴 혼합)
 */
export type EditorGoogleFont = {
  id: string
  label: string
  /** CSS / Fabric fontFamily */
  family: string
  weights: number[]
  category: 'sans' | 'serif' | 'display' | 'handwriting'
}

/** 인기·썸네일용 Google Fonts 목록 (기본 Noto Sans KR은 next/font 별도) */
export const EDITOR_GOOGLE_FONTS: readonly EditorGoogleFont[] = [
  { id: 'noto-serif-kr', label: 'Noto Serif KR', family: 'Noto Serif KR', weights: [400, 700], category: 'serif' },
  { id: 'black-han-sans', label: 'Black Han Sans', family: 'Black Han Sans', weights: [400], category: 'display' },
  { id: 'do-hyeon', label: 'Do Hyeon', family: 'Do Hyeon', weights: [400], category: 'display' },
  { id: 'jua', label: 'Jua', family: 'Jua', weights: [400], category: 'display' },
  { id: 'nanum-gothic', label: 'Nanum Gothic', family: 'Nanum Gothic', weights: [400, 700], category: 'sans' },
  { id: 'nanum-myeongjo', label: 'Nanum Myeongjo', family: 'Nanum Myeongjo', weights: [400, 700], category: 'serif' },
  { id: 'nanum-pen', label: 'Nanum Pen Script', family: 'Nanum Pen Script', weights: [400], category: 'handwriting' },
  { id: 'gothic-a1', label: 'Gothic A1', family: 'Gothic A1', weights: [400, 700], category: 'sans' },
  { id: 'song-myung', label: 'Song Myung', family: 'Song Myung', weights: [400], category: 'serif' },
  { id: 'gowun-dodum', label: 'Gowun Dodum', family: 'Gowun Dodum', weights: [400], category: 'sans' },
  { id: 'gowun-batang', label: 'Gowun Batang', family: 'Gowun Batang', weights: [400, 700], category: 'serif' },
  { id: 'ibm-plex-sans-kr', label: 'IBM Plex Sans KR', family: 'IBM Plex Sans KR', weights: [400, 700], category: 'sans' },
  { id: 'hahmlet', label: 'Hahmlet', family: 'Hahmlet', weights: [400, 700], category: 'serif' },
  { id: 'gaegu', label: 'Gaegu', family: 'Gaegu', weights: [400, 700], category: 'handwriting' },
  { id: 'hi-melody', label: 'Hi Melody', family: 'Hi Melody', weights: [400], category: 'handwriting' },
  { id: 'poor-story', label: 'Poor Story', family: 'Poor Story', weights: [400], category: 'display' },
  { id: 'single-day', label: 'Single Day', family: 'Single Day', weights: [400], category: 'handwriting' },
  { id: 'roboto', label: 'Roboto', family: 'Roboto', weights: [400, 700], category: 'sans' },
  { id: 'open-sans', label: 'Open Sans', family: 'Open Sans', weights: [400, 700], category: 'sans' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', weights: [400, 700], category: 'sans' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', weights: [400, 700], category: 'sans' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', weights: [400, 700], category: 'sans' },
  { id: 'bebas-neue', label: 'Bebas Neue', family: 'Bebas Neue', weights: [400], category: 'display' },
  { id: 'playfair', label: 'Playfair Display', family: 'Playfair Display', weights: [400, 700], category: 'serif' },
  { id: 'anton', label: 'Anton', family: 'Anton', weights: [400], category: 'display' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', weights: [400], category: 'handwriting' },
  { id: 'lobster', label: 'Lobster', family: 'Lobster', weights: [400], category: 'display' },
  { id: 'permanent-marker', label: 'Permanent Marker', family: 'Permanent Marker', weights: [400], category: 'handwriting' },
  { id: 'bangers', label: 'Bangers', family: 'Bangers', weights: [400], category: 'display' },
  { id: 'nunito', label: 'Nunito', family: 'Nunito', weights: [400, 700], category: 'sans' },
  { id: 'rubik', label: 'Rubik', family: 'Rubik', weights: [400, 700], category: 'sans' },
] as const

const GOOGLE_FONTS_LINK_ID = 'frame-pick-google-fonts'

/**
 * Google Fonts CSS2 URL을 만든다.
 * @returns {string}
 */
export function buildGoogleFontsCssUrl(): string {
  const families = EDITOR_GOOGLE_FONTS.map((font) => {
    const name = font.family.replace(/ /g, '+')
    if (font.weights.length === 1 && font.weights[0] === 400) {
      return `family=${name}`
    }
    const weights = [...new Set(font.weights)].sort((a, b) => a - b).join(';')
    return `family=${name}:wght@${weights}`
  })
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/**
 * Google Fonts 스타일시트가 head에 없으면 삽입한다.
 * @returns {void}
 */
export function ensureGoogleFontsStylesheet(): void {
  if (typeof document === 'undefined') {
    return
  }
  if (document.getElementById(GOOGLE_FONTS_LINK_ID)) {
    return
  }
  const link = document.createElement('link')
  link.id = GOOGLE_FONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = buildGoogleFontsCssUrl()
  document.head.appendChild(link)
}

/**
 * 목록에 있는 Google Font인지 확인한다.
 * @param {string} fontFamily
 * @returns {EditorGoogleFont | undefined}
 */
export function findGoogleFont(fontFamily: string): EditorGoogleFont | undefined {
  const primary = fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') ?? fontFamily
  return EDITOR_GOOGLE_FONTS.find((font) => font.family === primary)
}
