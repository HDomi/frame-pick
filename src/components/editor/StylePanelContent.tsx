'use client'

import { useState } from 'react'
import { BackgroundControls } from '@/components/editor/BackgroundControls'
import { ImageFitControls } from '@/components/editor/ImageFitControls'
import { TextControls } from '@/components/editor/TextControls'
import { PanelSection, SegmentedControl } from '@/components/ui'

export type StyleTab = 'background' | 'image' | 'text'

const STYLE_TABS: { value: StyleTab; label: string }[] = [
  { value: 'background', label: '배경' },
  { value: 'image', label: '이미지' },
  { value: 'text', label: '텍스트' },
]

interface StylePanelContentProps {
  tab?: StyleTab
  onTabChange?: (tab: StyleTab) => void
}

/**
 * 배경·이미지·텍스트 스타일 편집 본문 (탭)
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
    </div>
  )
}
