'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconButton } from '@/components/ui'
import { cn } from '@/lib/cn'

const MENU_LINKS = [
  { href: '/terms/', label: '이용약관' },
  { href: '/licenses/', label: '오픈소스·에셋 라이선스' },
  { href: '/privacy/', label: '개인정보 고지' },
] as const

/**
 * 헤더 로고 옆 햄버거 메뉴 (약관/라이선스 이동)
 * @returns {React.ReactElement}
 */
export function HeaderMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    /**
     * 바깥 클릭 시 닫기
     * @param {MouseEvent} event - 클릭
     * @returns {void}
     */
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    /**
     * Escape로 닫기
     * @param {KeyboardEvent} event - 키
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden className="flex flex-col gap-1">
          <span className="block h-0.5 w-4 rounded bg-current" />
          <span className="block h-0.5 w-4 rounded bg-current" />
          <span className="block h-0.5 w-4 rounded bg-current" />
        </span>
      </IconButton>

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute left-0 top-full z-40 mt-1 min-w-[12rem] rounded-md border border-[var(--color-border)]',
            'bg-[var(--color-surface)] py-1 shadow-lg',
          )}
        >
          {MENU_LINKS.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
