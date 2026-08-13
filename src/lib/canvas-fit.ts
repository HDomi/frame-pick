import type { Canvas } from 'fabric'
import type { CanvasSize } from '@/lib/canvas-size'
import { ensureBackgroundLayer, isBackgroundObject } from '@/lib/background-layer'
import { CANVAS_ASPECT_RATIO } from '@/lib/constants'

/**
 * 컨테이너 너비에 맞춰 캔버스를 CSS로만 스케일한다.
 * 논리 해상도(1920×1080 등)와 객체 좌표는 그대로 유지한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {HTMLElement} container - 뷰포트 컨테이너
 * @param {number} logicalWidth - 논리 가로 해상도
 * @returns {void}
 */
export function fitCanvasToContainer(
  canvas: Canvas,
  container: HTMLElement,
  logicalWidth: number,
): void {
  const containerWidth = container.clientWidth
  if (containerWidth <= 0 || logicalWidth <= 0) {
    return
  }

  const logicalHeight = logicalWidth / CANVAS_ASPECT_RATIO
  const displayHeight = containerWidth / CANVAS_ASPECT_RATIO

  // zoom으로 맞추면 export/미리보기 좌표가 어긋나므로 논리 해상도 유지 + CSS 스케일만 사용
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  canvas.setZoom(1)
  canvas.setDimensions({
    width: logicalWidth,
    height: logicalHeight,
  })
  canvas.setDimensions(
    {
      width: `${containerWidth}px`,
      height: `${displayHeight}px`,
    },
    { cssOnly: true },
  )
  canvas.calcOffset()
  canvas.requestRenderAll()
}

/**
 * 논리 해상도를 바꾸고 기존 객체를 비율에 맞게 스케일한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {CanvasSize} nextSize - 새 해상도
 * @param {CanvasSize} prevSize - 이전 해상도
 * @returns {void}
 */
export function applyCanvasSize(
  canvas: Canvas,
  nextSize: CanvasSize,
  prevSize: CanvasSize,
): void {
  const scaleX = nextSize.width / prevSize.width
  const scaleY = nextSize.height / prevSize.height

  canvas.getObjects().forEach((object) => {
    if (isBackgroundObject(object)) {
      return
    }
    object.scaleX = (object.scaleX ?? 1) * scaleX
    object.scaleY = (object.scaleY ?? 1) * scaleY
    object.left = (object.left ?? 0) * scaleX
    object.top = (object.top ?? 0) * scaleY
    object.setCoords()
  })

  if (canvas.backgroundImage && typeof canvas.backgroundImage === 'object') {
    const background = canvas.backgroundImage
    background.scaleX = (background.scaleX ?? 1) * scaleX
    background.scaleY = (background.scaleY ?? 1) * scaleY
    background.left = (background.left ?? 0) * scaleX
    background.top = (background.top ?? 0) * scaleY
    background.setCoords()
  }

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  canvas.setZoom(1)
  canvas.setDimensions({
    width: nextSize.width,
    height: nextSize.height,
  })
  ensureBackgroundLayer(canvas)
  canvas.calcOffset()
  canvas.requestRenderAll()
}
