'use client'

import { useEffect } from 'react'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import { useVideoSession } from '@/contexts/VideoSessionContext'
import { useCanvas } from '@/hooks/useCanvas'
import {
  copyCanvasSelection,
  isEditableKeyboardTarget,
  pasteCanvasClipboard,
} from '@/lib/canvas-clipboard'

/**
 * Ctrl/Cmd+C · Ctrl/Cmd+V 로 캔버스 객체 복사/붙여넣기
 * @returns {void}
 */
export function useCanvasClipboard(): void {
  const { canvas, isReady } = useCanvas()
  const { isLoading } = useLoading()
  const { isExtracting } = useVideoSession()
  const { toast } = useToast()
  const locked = isLoading || isExtracting

  useEffect(() => {
    if (!canvas || !isReady) {
      return
    }

    /**
     * @param {KeyboardEvent} event
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()
      if (key !== 'c' && key !== 'v') {
        return
      }

      if (isEditableKeyboardTarget(event.target)) {
        return
      }

      if (locked) {
        return
      }

      if (key === 'c') {
        event.preventDefault()
        void copyCanvasSelection(canvas).then((ok) => {
          if (ok) {
            toast({ message: '복사했습니다.', variant: 'info', durationMs: 1400 })
          }
        })
        return
      }

      event.preventDefault()
      void pasteCanvasClipboard(canvas).then((ok) => {
        if (ok) {
          toast({ message: '붙여넣었습니다.', variant: 'success', durationMs: 1400 })
        }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canvas, isReady, locked, toast])
}
