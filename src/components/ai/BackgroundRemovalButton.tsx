'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { CutoutDialog } from '@/components/ai/CutoutDialog'
import { useLoading } from '@/contexts/LoadingContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'

/**
 * 「누끼 후 업로드」 진입 버튼
 * @returns {React.ReactElement}
 */
export function BackgroundRemovalButton() {
  const { isReady } = useCanvas()
  const { isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const [open, setOpen] = useState(false)
  const locked = isLoading || isExtracting

  return (
    <>
      <Button
        variant="tool"
        size="lg"
        fullWidth
        disabled={!isReady || locked}
        onClick={() => setOpen(true)}
      >
        누끼 후 업로드
      </Button>
      <CutoutDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
