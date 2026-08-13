'use client'

import { useState } from 'react'
import { BackgroundControls } from '@/components/editor/BackgroundControls'
import { ImageFitControls } from '@/components/editor/ImageFitControls'
import { TextControls } from '@/components/editor/TextControls'
import { PanelSection, SegmentedControl } from '@/components/ui'

type StyleTab = 'background' | 'image' | 'text'

const STYLE_TABS: { value: StyleTab; label: string }[] = [
  { value: 'background', label: '배경' },
  { value: 'image', label: '이미지' },
  { value: 'text', label: '텍스트' },
]

/**
 * 배경·이미지·텍스트 스타일 편집 본문 (탭)
 * @returns {React.ReactElement}
 */
export function StylePanelContent() {
  const [tab, setTab] = useState<StyleTab>('text')

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl value={tab} options={STYLE_TABS} onChange={setTab} />

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
