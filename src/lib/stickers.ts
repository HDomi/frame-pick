import { BASE_PATH } from '@/lib/constants'

export type StickerCategoryId = 'arrows' | 'marks' | 'shapes' | 'emoji'

export interface StickerItem {
  id: string
  name: string
  path: string
  license?: string
}

export interface StickerCategory {
  id: StickerCategoryId | string
  label: string
  items: StickerItem[]
}

export interface StickerManifest {
  version: number
  categories: StickerCategory[]
}

/**
 * 스티커 public URL을 만든다.
 * @param {string} relativePath - manifest path
 * @returns {string}
 */
export function getStickerUrl(relativePath: string): string {
  const cleaned = relativePath.replace(/^\//, '')
  return `${BASE_PATH}/stickers/${cleaned}`
}

/**
 * 스티커 매니페스트를 로드한다.
 * @returns {Promise<StickerManifest>}
 */
export async function loadStickerManifest(): Promise<StickerManifest> {
  const response = await fetch(`${BASE_PATH}/stickers/manifest.json`, {
    cache: 'force-cache',
  })
  if (!response.ok) {
    throw new Error('스티커 목록을 불러오지 못했습니다.')
  }
  return (await response.json()) as StickerManifest
}
