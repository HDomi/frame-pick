'use client'

import { useEffect } from 'react'
import { ensureGoogleFontsStylesheet } from '@/lib/google-fonts'

/**
 * 에디터용 Google Fonts CSS를 한 번 주입한다.
 * @returns {null}
 */
export function GoogleFontsLoader() {
  useEffect(() => {
    ensureGoogleFontsStylesheet()
  }, [])

  return null
}
