'use client'

import { Button } from '@/components/ui'

const STICKER_SLOTS = ['화살표', '강조 상자', '느낌표', '대화창']

/**
 * 유튜브용 SVG 스티커 패널 stub
 * @returns {React.ReactElement} - 스티커 패널
 */
export function StickerPanel() {
  /**
   * 스티커 추가 핸들러 (stub)
   * @param {string} _stickerName - 스티커 이름
   * @returns {void}
   */
  const handleAddSticker = (_stickerName: string) => {
    // TODO: SVG 스티커를 캔버스에 추가
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {STICKER_SLOTS.map((name) => (
        <Button key={name} variant="tile" size="sm" onClick={() => handleAddSticker(name)}>
          {name}
        </Button>
      ))}
    </div>
  )
}
