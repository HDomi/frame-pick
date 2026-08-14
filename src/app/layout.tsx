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
  keywords: ['유튜브', '썸네일', '에디터', '프레임 추출', '누끼', 'Frame Pick'],
  robots: {
    index: true,
    follow: true,
  },
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
    // metadataBase(SITE_URL)에 이미 `/frame-pick` 경로가 포함되어 있으므로
    // 여기서 BASE_PATH를 덧붙이면 경로가 중복된다.
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Frame Pick — 영상 프레임을 추출해 유튜브 썸네일을 만드는 브라우저 에디터',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frame Pick | 유튜브 썸네일 에디터',
    description:
      '서버 비용 없이 브라우저에서 영상 프레임을 추출하고 유튜브 썸네일을 편집하세요.',
    images: ['/og-image.png'],
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
