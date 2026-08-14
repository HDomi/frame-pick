'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { useEditorSession } from '@/contexts/EditorSessionContext'
import { cn } from '@/lib/cn'

/**
 * 프로젝트·페이지 전환/추가/이름변경/삭제
 * @returns {React.ReactElement}
 */
export function WorkspaceSwitcher() {
  const {
    isHydrated,
    projects,
    pages,
    currentProjectId,
    currentPageId,
    switchProject,
    switchPage,
    createProjectAndSwitch,
    createPageAndSwitch,
    renameCurrentProject,
    renameCurrentPage,
    deleteCurrentPage,
    deleteCurrentProject,
  } = useEditorSession()
  const [busy, setBusy] = useState(false)
  const disabled = !isHydrated || busy

  /**
   * @param {() => Promise<void>} action
   * @returns {Promise<void>}
   */
  const run = async (action: () => Promise<void>) => {
    if (disabled) {
      return
    }
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-0 max-w-[min(28rem,46vw)] flex-wrap items-center gap-1.5">
      <label className="sr-only" htmlFor="workspace-project">
        프로젝트
      </label>
      <select
        id="workspace-project"
        disabled={disabled}
        value={currentProjectId}
        className={cn(
          'max-w-[9.5rem] truncate rounded-md border border-[var(--color-border)]',
          'bg-[var(--color-surface-raised)] px-1.5 py-1 text-xs text-[var(--color-text)]',
        )}
        onChange={(event) => {
          void run(async () => switchProject(event.target.value))
        }}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="workspace-page">
        페이지
      </label>
      <select
        id="workspace-page"
        disabled={disabled}
        value={currentPageId}
        className={cn(
          'max-w-[8.5rem] truncate rounded-md border border-[var(--color-border)]',
          'bg-[var(--color-surface-raised)] px-1.5 py-1 text-xs text-[var(--color-text)]',
        )}
        onChange={(event) => {
          void run(async () => switchPage(event.target.value))
        }}
      >
        {pages.map((page) => (
          <option key={page.id} value={page.id}>
            {page.name}
          </option>
        ))}
      </select>

      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="px-1.5 text-[11px]"
        onClick={() => {
          void run(createPageAndSwitch)
        }}
      >
        +페이지
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="px-1.5 text-[11px]"
        onClick={() => {
          void run(createProjectAndSwitch)
        }}
      >
        +프로젝트
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="px-1.5 text-[11px]"
        onClick={() => {
          const next = window.prompt('프로젝트 이름', projects.find((p) => p.id === currentProjectId)?.name ?? '')
          if (next == null) {
            return
          }
          void run(async () => renameCurrentProject(next))
        }}
      >
        이름
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="px-1.5 text-[11px]"
        onClick={() => {
          const next = window.prompt('페이지 이름', pages.find((p) => p.id === currentPageId)?.name ?? '')
          if (next == null) {
            return
          }
          void run(async () => renameCurrentPage(next))
        }}
      >
        페이지명
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || pages.length <= 1}
        className="px-1.5 text-[11px] text-[var(--color-text-muted)]"
        onClick={() => {
          void run(deleteCurrentPage)
        }}
      >
        페이지삭제
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || projects.length <= 1}
        className="px-1.5 text-[11px] text-[var(--color-text-muted)]"
        onClick={() => {
          void run(deleteCurrentProject)
        }}
      >
        프로젝트삭제
      </Button>
    </div>
  )
}
