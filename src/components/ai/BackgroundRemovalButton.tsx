'use client'

import { Button } from '@/components/ui'

/**
 * AI 배경(누끼) 제거 버튼 stub
 * @returns {React.ReactElement} - 누끼 제거 버튼
 */
export function BackgroundRemovalButton() {
  /**
   * 누끼 제거 실행 (stub)
   * @returns {Promise<void>}
   */
  const handleRemoveBackground = async () => {
    // TODO: removeBackground dynamic import 연동
  }

  return (
    <Button variant="tool" size="lg" fullWidth onClick={handleRemoveBackground}>
      AI 누끼 제거
    </Button>
  )
}
