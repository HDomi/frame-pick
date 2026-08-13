'use client'

import { StyleDrawer } from '@/components/editor/StyleDrawer'
import { LayerManager } from '@/components/editor/LayerManager'
import { PanelSection } from '@/components/ui'

/**
 * 우측 속성/레이어 패널
 * @returns {React.ReactElement} - 우측 패널
 */
export function RightPanel() {
  return (
    <aside
      className="relative flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto p-3 backdrop-blur-sm"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)' }}
    >
      <PanelSection title="레이어" className="shrink-0">
        <div className="max-h-[38vh] min-h-0 overflow-y-auto pr-0.5">
          <LayerManager />
        </div>
      </PanelSection>

      <PanelSection title="스타일" className="flex min-h-0 flex-1 flex-col">
        <StyleDrawer />
      </PanelSection>
    </aside>
  )
}
