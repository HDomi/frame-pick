'use client'

import { useEffect, useRef } from 'react'
import { Canvas } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasFit } from '@/hooks/useCanvasFit'
import { getWorkspaceSize } from '@/lib/artboard'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { enableOffArtboardInteraction, ensureWorkspaceLayout, WORKSPACE_BG } from '@/lib/image-sticker'
import { cn } from '@/lib/cn'

/**
 * Fabric.js 아트보드 + 패스트보드 — cover fit으로 셸 전체가 히트 영역 (z-0)
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

    const size = canvasSize
    const nextWorkspace = getWorkspaceSize(size)

    const fabricCanvas = new Canvas(canvasEl, {
      width: nextWorkspace.width,
      height: nextWorkspace.height,
      backgroundColor: WORKSPACE_BG,
      preserveObjectStacking: true,
      selection: true,
      enableRetinaScaling: false,
      controlsAboveOverlay: true,
    })

    ensureWorkspaceLayout(fabricCanvas, size)
    ensureBackgroundLayer(fabricCanvas)
    enableOffArtboardInteraction(fabricCanvas)
    registerCanvas(fabricCanvas)

    return () => {
      registerCanvas(null)
      fabricCanvas.dispose()
    }
    // 초기 마운트만 — 해상도 변경은 setCanvasSizeId / applyCanvasSize가 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCanvas])

  useCanvasFit(canvas, containerRef, canvasSize.width, canvasSize.height)

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full w-full min-h-0 min-w-0 overflow-hidden',
        '[&_.canvas-container]:!overflow-hidden',
      )}
      style={{ backgroundColor: WORKSPACE_BG }}
    >
      <canvas ref={canvasElRef} aria-label="썸네일 편집 캔버스" role="img" />
    </div>
  )
}
