'use client'

import { useState } from 'react'
import { BackgroundControls } from '@/components/editor/BackgroundControls'
import { LayerManager } from '@/components/editor/LayerManager'
import { TextControls } from '@/components/editor/TextControls'
import { LeftToolbar } from '@/components/layout/LeftToolbar'
import { PanelSection, SegmentedControl } from '@/components/ui'
import { cn } from '@/lib/cn'

type MobileSheetTab = 'tools' | 'layers' | 'style'

const SHEET_TABS: { value: MobileSheetTab; label: string }[] = [
  { value: 'tools', label: '도구' },
  { value: 'layers', label: '레이어' },
  { value: 'style', label: '스타일' },
]

/**
 * md 미만용 하단 시트형 에디터 툴바 (도구/레이어/스타일)
 * @returns {React.ReactElement}
 */
export function MobileEditorSheet() {
  const [tab, setTab] = useState<MobileSheetTab>('tools')
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      className={cn(
        'shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <SegmentedControl
          className="min-w-0 flex-1"
          value={tab}
          options={SHEET_TABS}
          onChange={(next) => {
            setTab(next)
            setExpanded(true)
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
        >
          {expanded ? '접기' : '펼치기'}
        </button>
      </div>

      {expanded ? (
        <div className="max-h-[42dvh] overflow-y-auto overscroll-contain">
          {tab === 'tools' ? <LeftToolbar /> : null}
          {tab === 'layers' ? (
            <div className="flex flex-col gap-4 p-3">
              <PanelSection title="레이어">
                <LayerManager />
              </PanelSection>
            </div>
          ) : null}
          {tab === 'style' ? (
            <div className="flex flex-col gap-4 p-3">
              <PanelSection title="배경">
                <BackgroundControls />
              </PanelSection>
              <PanelSection title="텍스트 / 스타일">
                <TextControls />
              </PanelSection>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
