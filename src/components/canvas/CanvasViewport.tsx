'use client'

import { useEffect, useRef } from 'react'
import { Canvas } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasFit } from '@/hooks/useCanvasFit'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { CANVAS_ASPECT_RATIO } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * Fabric.js 16:9 캔버스 뷰포트
 * @returns {React.ReactElement} - 캔버스 영역
 */
export function CanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const { canvas, canvasSize, registerCanvas } = useCanvas()

  useEffect(() => {
    const canvasEl = canvasElRef.current
    if (!canvasEl) {
      return
    }

    const fabricCanvas = new Canvas(canvasEl, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
      enableRetinaScaling: false,
    })

    registerCanvas(fabricCanvas)
    ensureBackgroundLayer(fabricCanvas)

    return () => {
      registerCanvas(null)
      fabricCanvas.dispose()
    }
    // 초기 마운트만 — 해상도 변경은 setCanvasSizeId / applyCanvasSize가 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCanvas])

  useCanvasFit(canvas, containerRef, canvasSize.width)

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        ref={containerRef}
        className={cn(
          'w-full max-w-4xl overflow-hidden rounded-md border border-[var(--color-border)] bg-[#1a1d24] shadow-lg [&_.canvas-container]:mx-auto',
        )}
        style={{ aspectRatio: CANVAS_ASPECT_RATIO }}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
