import type { Canvas } from 'fabric'
import type { CanvasSize } from '@/lib/canvas-size'
import { ensureBackgroundLayer, isBackgroundObject } from '@/lib/background-layer'
import { CANVAS_ASPECT_RATIO } from '@/lib/constants'

/**
 * 컨테이너 너비에 맞춰 캔버스를 CSS로만 스케일한다.
 * 논리 해상도가 이미 맞으면 setDimensions(buffer)를 다시 호출하지 않는다.
 * (패널 리사이즈 틱마다 buffer reset → 깜빡임/이미지 유실 방지)
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
  const cssWidth = `${containerWidth}px`
  const cssHeight = `${displayHeight}px`

  const needsLogicalReset =
    Math.abs(canvas.getWidth() - logicalWidth) > 0.5 ||
    Math.abs(canvas.getHeight() - logicalHeight) > 0.5

  if (needsLogicalReset) {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)
    canvas.setDimensions({
      width: logicalWidth,
      height: logicalHeight,
    })
  }

  const lower = canvas.lowerCanvasEl
  const upper = canvas.upperCanvasEl
  const cssChanged =
    lower.style.width !== cssWidth ||
    lower.style.height !== cssHeight ||
    upper?.style.width !== cssWidth ||
    upper?.style.height !== cssHeight

  if (cssChanged || needsLogicalReset) {
    canvas.setDimensions(
      {
        width: cssWidth,
        height: cssHeight,
      },
      { cssOnly: true },
    )
    canvas.calcOffset()
    canvas.requestRenderAll()
  } else {
    canvas.calcOffset()
  }
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
