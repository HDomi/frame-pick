import { Point, type Canvas } from 'fabric'

/** 뷰포트 최소 줌 (10%) */
export const CANVAS_ZOOM_MIN = 0.1

/** 뷰포트 최대 줌 (800%) */
export const CANVAS_ZOOM_MAX = 8

/** 버튼 ± 한 스텝 */
export const CANVAS_ZOOM_STEP = 1.15

/**
 * 줌 값을 허용 범위로 클램프한다.
 * @param {number} zoom
 * @returns {number}
 */
export function clampCanvasZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 1
  }
  return Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, zoom))
}

/**
 * 현재 줌 배율을 퍼센트로 표시한다.
 * @param {number} zoom
 * @returns {number}
 */
export function zoomToPercent(zoom: number): number {
  return Math.round(clampCanvasZoom(zoom) * 100)
}

/**
 * 포인터(뷰포트 좌표) 기준으로 줌한다. 다운로드 해상도는 변하지 않는다.
 * Fabric `zoomToPoint`는 씬이 아니라 뷰포트 좌표를 받는다.
 * @param {Canvas} canvas
 * @param {Point} point - 뷰포트 좌표 (`getViewportPoint`)
 * @param {number} nextZoom
 * @returns {number} - 적용된 줌
 */
export function zoomCanvasToPoint(canvas: Canvas, point: Point, nextZoom: number): number {
  const zoom = clampCanvasZoom(nextZoom)
  canvas.zoomToPoint(point, zoom)
  canvas.requestRenderAll()
  return zoom
}

/**
 * 화면 중앙(뷰포트) 기준으로 상대 줌한다.
 * @param {Canvas} canvas
 * @param {number} nextZoom
 * @returns {number}
 */
export function zoomCanvasCentered(canvas: Canvas, nextZoom: number): number {
  // getCenterPoint = (width/2, height/2) — zoomToPoint용 뷰포트 중심
  const center = canvas.getCenterPoint()
  return zoomCanvasToPoint(canvas, center, nextZoom)
}

/**
 * CSS 표시 크기와 논리 캔버스 비율로 화면 픽셀 델타를 논리 델타로 바꾼다.
 * @param {Canvas} canvas
 * @param {number} deltaX - 화면(CSS) px
 * @param {number} deltaY - 화면(CSS) px
 * @returns {Point}
 */
export function screenDeltaToCanvas(canvas: Canvas, deltaX: number, deltaY: number): Point {
  const bounds = canvas.upperCanvasEl.getBoundingClientRect()
  const scaleX = bounds.width > 0 ? canvas.getWidth() / bounds.width : 1
  const scaleY = bounds.height > 0 ? canvas.getHeight() / bounds.height : 1
  return new Point(deltaX * scaleX, deltaY * scaleY)
}

/**
 * 뷰포트를 100%·원점으로 되돌린다. (화면 맞춤 — 논리 해상도 유지)
 * @param {Canvas} canvas
 * @returns {void}
 */
export function resetCanvasViewport(canvas: Canvas): void {
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  canvas.setZoom(1)
  canvas.requestRenderAll()
}

/**
 * 화면 픽셀 델타만큼 팬한다.
 * @param {Canvas} canvas
 * @param {number} deltaX
 * @param {number} deltaY
 * @returns {void}
 */
export function panCanvasBy(canvas: Canvas, deltaX: number, deltaY: number): void {
  canvas.relativePan(new Point(deltaX, deltaY))
  canvas.requestRenderAll()
}
