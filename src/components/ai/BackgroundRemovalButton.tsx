'use client'

import { useState } from 'react'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import { IconButton } from '@/components/ui'
import { CutoutDialog } from '@/components/ai/CutoutDialog'
import { useLoading } from '@/contexts/LoadingContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'
import { cn } from '@/lib/cn'

/**
 * 「이미지로 스티커 만들기」 아이콘 버튼
 * @returns {React.ReactElement}
 */
export function BackgroundRemovalButton() {
  const { isReady } = useCanvas()
  const { isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const [open, setOpen] = useState(false)
  const locked = isLoading || isExtracting
  const disabled = !isReady || locked

  return (
    <>
      <IconButton
        label="이미지로 스티커 만들기"
        disabled={disabled}
        className={cn(
          'size-10 border border-[var(--color-border)] bg-[var(--color-surface-raised)]',
          'hover:border-[var(--color-accent)] disabled:opacity-60',
        )}
        onClick={() => setOpen(true)}
      >
        <ContentCutIcon sx={{ fontSize: 22 }} />
      </IconButton>
      <CutoutDialog isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
