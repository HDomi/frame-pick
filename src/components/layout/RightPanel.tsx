'use client'

import { BackgroundControls } from '@/components/editor/BackgroundControls'
import { LayerManager } from '@/components/editor/LayerManager'
import { TextControls } from '@/components/editor/TextControls'
import { PanelSection } from '@/components/ui'

/**
 * 우측 속성/레이어 패널
 * @returns {React.ReactElement} - 우측 패널
 */
export function RightPanel() {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto bg-[var(--color-surface)] p-3">
      <PanelSection title="배경">
        <BackgroundControls />
      </PanelSection>

      <PanelSection title="레이어">
        <LayerManager />
      </PanelSection>

      <PanelSection title="텍스트 / 스타일">
        <TextControls />
      </PanelSection>
    </aside>
  )
}
