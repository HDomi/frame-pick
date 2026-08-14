import type { Canvas, FabricObject } from 'fabric'
import { getArtboardBounds } from '@/lib/artboard'
import type { CanvasSize } from '@/lib/canvas-size'
import { isBackgroundObject } from '@/lib/background-layer'

/** 스냅 허용 거리 (씬 px) */
export const SNAP_THRESHOLD = 10

export type SnapGuide = {
  orientation: 'horizontal' | 'vertical'
  /** 씬 좌표 */
  position: number
}

export type SnapResult = {
  left?: number
  top?: number
  guides: SnapGuide[]
}

/**
 * 객체의 축정렬 바운딩 박스 중심·가장자리를 구한다.
 * @param {FabricObject} object
 * @returns {{ left: number; right: number; top: number; bottom: number; cx: number; cy: number }}
 */
function getObjectEdges(object: FabricObject) {
  const bound = object.getBoundingRect()
  return {
    left: bound.left,
    right: bound.left + bound.width,
    top: bound.top,
    bottom: bound.top + bound.height,
    cx: bound.left + bound.width / 2,
    cy: bound.top + bound.height / 2,
  }
}

/**
 * 이동 중 객체를 아트보드·다른 객체에 스냅하고 가이드를 만든다.
 * @param {Canvas} canvas
 * @param {FabricObject} target - 이동 중인 객체
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard
 * @returns {SnapResult}
 */
export function computeObjectSnap(
  canvas: Canvas,
  target: FabricObject,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
): SnapResult {
  const bounds = getArtboardBounds(canvas, artboard)
  const moving = getObjectEdges(target)
  const width = moving.right - moving.left
  const height = moving.bottom - moving.top

  const xTargets: { value: number; kind: 'edge' | 'center' }[] = [
    { value: bounds.left, kind: 'edge' },
    { value: bounds.left + bounds.width / 2, kind: 'center' },
    { value: bounds.left + bounds.width, kind: 'edge' },
  ]
  const yTargets: { value: number; kind: 'edge' | 'center' }[] = [
    { value: bounds.top, kind: 'edge' },
    { value: bounds.top + bounds.height / 2, kind: 'center' },
    { value: bounds.top + bounds.height, kind: 'edge' },
  ]

  canvas.getObjects().forEach((object) => {
    if (object === target || isBackgroundObject(object) || !object.visible) {
      return
    }
    const edges = getObjectEdges(object)
    xTargets.push(
      { value: edges.left, kind: 'edge' },
      { value: edges.cx, kind: 'center' },
      { value: edges.right, kind: 'edge' },
    )
    yTargets.push(
      { value: edges.top, kind: 'edge' },
      { value: edges.cy, kind: 'center' },
      { value: edges.bottom, kind: 'edge' },
    )
  })

  const movingX = [
    { key: 'left' as const, value: moving.left },
    { key: 'cx' as const, value: moving.cx },
    { key: 'right' as const, value: moving.right },
  ]
  const movingY = [
    { key: 'top' as const, value: moving.top },
    { key: 'cy' as const, value: moving.cy },
    { key: 'bottom' as const, value: moving.bottom },
  ]

  let bestDx: number | null = null
  let snapLeft: number | undefined
  let guideX: number | undefined

  for (const mx of movingX) {
    for (const tx of xTargets) {
      const dx = tx.value - mx.value
      if (Math.abs(dx) > SNAP_THRESHOLD) {
        continue
      }
      if (bestDx === null || Math.abs(dx) < Math.abs(bestDx)) {
        bestDx = dx
        guideX = tx.value
        if (mx.key === 'left') {
          snapLeft = tx.value
        } else if (mx.key === 'cx') {
          snapLeft = tx.value - width / 2
        } else {
          snapLeft = tx.value - width
        }
      }
    }
  }

  let bestDy: number | null = null
  let snapTop: number | undefined
  let guideY: number | undefined

  for (const my of movingY) {
    for (const ty of yTargets) {
      const dy = ty.value - my.value
      if (Math.abs(dy) > SNAP_THRESHOLD) {
        continue
      }
      if (bestDy === null || Math.abs(dy) < Math.abs(bestDy)) {
        bestDy = dy
        guideY = ty.value
        if (my.key === 'top') {
          snapTop = ty.value
        } else if (my.key === 'cy') {
          snapTop = ty.value - height / 2
        } else {
          snapTop = ty.value - height
        }
      }
    }
  }

  const guides: SnapGuide[] = []
  if (guideX != null) {
    guides.push({ orientation: 'vertical', position: guideX })
  }
  if (guideY != null) {
    guides.push({ orientation: 'horizontal', position: guideY })
  }

  // origin이 center인 객체는 left/top이 중심 — Fabric set left/top는 origin 기준
  const originX = target.originX ?? 'left'
  const originY = target.originY ?? 'top'
  let nextLeft = snapLeft
  let nextTop = snapTop

  if (nextLeft != null) {
    if (originX === 'center') {
      nextLeft = nextLeft + width / 2
    } else if (originX === 'right') {
      nextLeft = nextLeft + width
    }
  }
  if (nextTop != null) {
    if (originY === 'center') {
      nextTop = nextTop + height / 2
    } else if (originY === 'bottom') {
      nextTop = nextTop + height
    }
  }

  return {
    left: nextLeft,
    top: nextTop,
    guides,
  }
}

/**
 * 컨텍스트 상단 캔버스에 스냅 가이드를 그린다.
 * @param {Canvas} canvas
 * @param {SnapGuide[]} guides
 * @returns {void}
 */
export function drawSnapGuides(canvas: Canvas, guides: SnapGuide[]): void {
  const ctx = canvas.getTopContext()
  if (!ctx) {
    return
  }
  canvas.clearContext(ctx)
  if (guides.length === 0) {
    return
  }

  const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0]
  const zoom = canvas.getZoom()
  const width = canvas.getWidth()
  const height = canvas.getHeight()

  ctx.save()
  ctx.strokeStyle = '#22d3ee'
  ctx.lineWidth = 1 / zoom
  ctx.setLineDash([6 / zoom, 4 / zoom])

  guides.forEach((guide) => {
    if (guide.orientation === 'vertical') {
      const x = guide.position * vpt[0] + vpt[4]
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
      return
    }
    const y = guide.position * vpt[3] + vpt[5]
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  })

  ctx.restore()
}

/**
 * 상단 가이드 오버레이를 지운다.
 * @param {Canvas} canvas
 * @returns {void}
 */
export function clearSnapGuides(canvas: Canvas): void {
  const ctx = canvas.getTopContext()
  if (!ctx) {
    return
  }
  canvas.clearContext(ctx)
}
