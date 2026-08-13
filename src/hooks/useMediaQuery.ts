'use client'

import { useEffect, useState } from 'react'

/**
 * CSS 미디어 쿼리 매칭 여부를 구독한다.
 * @param {string} query - 미디어 쿼리 문자열
 * @returns {boolean} - 매칭 여부 (SSR/초기: false)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    /**
     * 매칭 상태를 동기화한다.
     * @returns {void}
     */
    const update = () => {
      setMatches(media.matches)
    }
    update()
    media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
    }
  }, [query])

  return matches
}

/** Tailwind md(768px) 미만 — 모바일 시트 레이아웃 */
export function useIsMobileLayout(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
