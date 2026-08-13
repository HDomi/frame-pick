import type { ReactNode } from 'react'
import Link from 'next/link'

interface LegalPageShellProps {
  title: string
  children: ReactNode
}

/**
 * 약관/라이선스 등 정적 고지 페이지 공통 셸
 * @param {LegalPageShellProps} props - 셸 props
 * @returns {React.ReactElement}
 */
export function LegalPageShell({ title, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-[var(--color-text)] hover:opacity-80"
          >
            Frame Pick
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-[var(--color-text-muted)]">
            <Link href="/terms/" className="hover:text-[var(--color-text)]">
              이용약관
            </Link>
            <Link href="/licenses/" className="hover:text-[var(--color-text)]">
              라이선스
            </Link>
            <Link href="/privacy/" className="hover:text-[var(--color-text)]">
              개인정보
            </Link>
            <Link href="/" className="hover:text-[var(--color-text)]">
              에디터
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--color-text)]">
          {children}
        </div>
      </main>
    </div>
  )
}
