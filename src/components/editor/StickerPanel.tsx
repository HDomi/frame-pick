'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvasSticker } from '@/hooks/useCanvasSticker'
import { getStickerUrl, loadStickerManifest, type StickerCategory } from '@/lib/stickers'
import { cn } from '@/lib/cn'

/**
 * 유튜브용 SVG 스티커 패널
 * @returns {React.ReactElement}
 */
export function StickerPanel() {
  const { isReady, addSticker } = useCanvasSticker()
  const { withLoading, isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const { toast } = useToast()
  const [categories, setCategories] = useState<StickerCategory[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('arrows')
  const locked = isLoading || isExtracting

  useEffect(() => {
    let cancelled = false
    /**
     * @returns {Promise<void>}
     */
    const load = async () => {
      try {
        const manifest = await loadStickerManifest()
        if (cancelled) {
          return
        }
        setCategories(manifest.categories)
        if (manifest.categories[0]) {
          setActiveCategory(manifest.categories[0].id)
        }
      } catch {
        if (!cancelled) {
          toast({ message: '스티커 목록을 불러오지 못했습니다.', variant: 'error' })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [toast])

  const active = categories.find((category) => category.id === activeCategory) ?? categories[0]

  /**
   * 스티커 추가
   * @param {string} path - 상대 경로
   * @param {string} name - 이름
   * @returns {Promise<void>}
   */
  const handleAddSticker = async (path: string, name: string) => {
    if (!isReady || locked) {
      toast({ message: '추출/처리 중에는 편집할 수 없습니다.', variant: 'info' })
      return
    }
    try {
      const ok = await withLoading(async () => addSticker(path, name), '스티커 추가 중…')
      if (!ok) {
        toast({ message: '스티커 추가에 실패했습니다.', variant: 'error' })
        return
      }
      toast({ message: `${name} 스티커를 추가했습니다.`, variant: 'success' })
    } catch {
      toast({ message: '스티커 추가에 실패했습니다.', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={cn(
              'rounded px-2 py-1 text-[11px]',
              category.id === active?.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]',
            )}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1">
        {(active?.items ?? []).map((item) => (
          <Button
            key={item.id}
            variant="tile"
            size="sm"
            disabled={!isReady || locked}
            className="flex h-auto flex-col gap-1 px-1 py-2"
            onClick={() => {
              void handleAddSticker(item.path, item.name)
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getStickerUrl(item.path)}
              alt={item.name}
              className="mx-auto h-8 w-8 object-contain"
            />
            <span className="truncate text-[10px]">{item.name}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
