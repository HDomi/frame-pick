import { Noto_Sans_KR } from 'next/font/google'

export const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

/** Fabric/CSS에 넣을 next/font 실제 font-family 값 */
export const EDITOR_FONT_FAMILY = notoSansKr.style.fontFamily
