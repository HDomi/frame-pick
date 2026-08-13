'use client'

import { useState } from 'react'
import { BackgroundControls } from '@/components/editor/BackgroundControls'
import { ImageFitControls } from '@/components/editor/ImageFitControls'
import { ShapeControls } from '@/components/editor/ShapeControls'
import { TextControls } from '@/components/editor/TextControls'
import { PanelSection, SegmentedControl } from '@/components/ui'

export type StyleTab = 'background' | 'image' | 'text' | 'shape'

const STYLE_TABS: { value: StyleTab; label: string }[] = [
  { value: 'background', label: '배경' },
  { value: 'image', label: '이미지' },
  { value: 'text', label: '텍스트' },
  { value: 'shape', label: '도형' },
]

interface StylePanelContentProps {
  tab?: StyleTab
  onTabChange?: (tab: StyleTab) => void
}

/**
 * 배경·이미지·텍스트·도형 스타일 편집 본문 (탭)
 * @param {StylePanelContentProps} props
 * @returns {React.ReactElement}
 */
export function StylePanelContent({
  tab: controlledTab,
  onTabChange,
}: StylePanelContentProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<StyleTab>('text')
  const isControlled = controlledTab != null && onTabChange != null
  const tab = isControlled ? controlledTab : uncontrolledTab

  /**
   * @param {StyleTab} next
   * @returns {void}
   */
  const handleTabChange = (next: StyleTab) => {
    if (isControlled) {
      onTabChange(next)
      return
    }
    setUncontrolledTab(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={tab}
        options={STYLE_TABS}
        onChange={handleTabChange}
        className="flex w-full flex-wrap"
      />

      {tab === 'background' ? (
        <PanelSection title="배경">
          <BackgroundControls />
        </PanelSection>
      ) : null}

      {tab === 'image' ? (
        <PanelSection title="이미지">
          <ImageFitControls />
        </PanelSection>
      ) : null}

      {tab === 'text' ? (
        <PanelSection title="텍스트">
          <TextControls />
        </PanelSection>
      ) : null}

      {tab === 'shape' ? (
        <PanelSection title="도형">
          <ShapeControls />
        </PanelSection>
      ) : null}
    </div>
  )
}
