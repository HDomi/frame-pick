import type { Metadata } from 'next'
import { BASE_PATH } from '@/lib/constants'
import { notoSansKr } from '@/lib/editor-font'
import './globals.css'

const SITE_URL = 'https://hdomi.github.io/frame-pick'

export const metadata: Metadata = {
  title: 'Frame Pick | 유튜브 썸네일 에디터',
  description:
    '서버 비용 없이 브라우저에서 영상 프레임을 추출하고 유튜브 썸네일을 편집하세요.',
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: `${BASE_PATH}/favicon.ico`, sizes: 'any' },
      { url: `${BASE_PATH}/favicon.svg`, type: 'image/svg+xml' },
      { url: `${BASE_PATH}/favicon-32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${BASE_PATH}/favicon-16.png`, sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: `${BASE_PATH}/apple-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Frame Pick | 유튜브 썸네일 에디터',
    description:
      '서버 비용 없이 브라우저에서 영상 프레임을 추출하고 유튜브 썸네일을 편집하세요.',
    url: SITE_URL,
    siteName: 'Frame Pick',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frame Pick | 유튜브 썸네일 에디터',
    description:
      '서버 비용 없이 브라우저에서 영상 프레임을 추출하고 유튜브 썸네일을 편집하세요.',
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

/**
 * 앱 전역 레이아웃
 * @param {RootLayoutProps} props - 레이아웃 props
 * @returns {React.ReactElement} - HTML 문서 골격
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className={`${notoSansKr.className} min-h-full antialiased`}>{children}</body>
    </html>
  )
}
