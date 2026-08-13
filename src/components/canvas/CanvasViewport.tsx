'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { useCanvasFit } from '@/hooks/useCanvasFit'
import { getWorkspaceSize } from '@/lib/artboard'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { enableOffArtboardInteraction, ensureWorkspaceLayout, WORKSPACE_BG } from '@/lib/image-sticker'
import { cn } from '@/lib/cn'

/**
 * Fabric.js 16:9 아트보드 + 바깥 핸들용 워크스페이스 뷰포트
 * @returns {React.ReactElement} - 캔버스 영역
 */
export function CanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const { canvas, canvasSize, registerCanvas } = useCanvas()
  const workspace = useMemo(() => getWorkspaceSize(canvasSize), [canvasSize])

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
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
      <div
        ref={containerRef}
        className={cn(
          'w-full max-w-5xl overflow-visible rounded-md border border-[var(--color-border)] bg-[#0c0e12] shadow-lg',
          '[&_.canvas-container]:mx-auto [&_.canvas-container]:!overflow-visible',
        )}
        style={{ aspectRatio: `${workspace.width} / ${workspace.height}` }}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
