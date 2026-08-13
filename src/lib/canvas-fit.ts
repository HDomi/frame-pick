import type { Canvas } from 'fabric'
import { getWorkspaceSize } from '@/lib/artboard'
import { ensureBackgroundLayer, isBackgroundObject } from '@/lib/background-layer'
import type { CanvasSize } from '@/lib/canvas-size'
import { WORKSPACE_BG, ensureWorkspaceLayout } from '@/lib/image-sticker'

/**
 * 컨테이너 너비에 맞춰 워크스페이스 캔버스를 CSS로만 스케일한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {HTMLElement} container - 뷰포트 컨테이너
 * @param {number} workspaceWidth - 워크스페이스 가로
 * @param {number} workspaceHeight - 워크스페이스 세로
 * @returns {void}
 */
export function fitCanvasToContainer(
  canvas: Canvas,
  container: HTMLElement,
  workspaceWidth: number,
  workspaceHeight: number,
): void {
  const containerWidth = container.clientWidth
  if (containerWidth <= 0 || workspaceWidth <= 0 || workspaceHeight <= 0) {
    return
  }

  const aspect = workspaceWidth / workspaceHeight
  const displayHeight = containerWidth / aspect
  const cssWidth = `${containerWidth}px`
  const cssHeight = `${displayHeight}px`

  const needsLogicalReset =
    Math.abs(canvas.getWidth() - workspaceWidth) > 0.5 ||
    Math.abs(canvas.getHeight() - workspaceHeight) > 0.5

  if (needsLogicalReset) {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)
    canvas.setDimensions({
      width: workspaceWidth,
      height: workspaceHeight,
    })
    canvas.backgroundColor = WORKSPACE_BG
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
 * 아트보드 해상도를 바꾸고 워크스페이스·객체를 비율에 맞게 스케일한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {CanvasSize} nextSize - 새 아트보드
 * @param {CanvasSize} prevSize - 이전 아트보드
 * @returns {void}
 */
export function applyCanvasSize(
  canvas: Canvas,
  nextSize: CanvasSize,
  prevSize: CanvasSize,
): void {
  const prevWorkspace = getWorkspaceSize(prevSize)
  const nextWorkspace = getWorkspaceSize(nextSize)
  const scaleX = nextWorkspace.width / prevWorkspace.width
  const scaleY = nextWorkspace.height / prevWorkspace.height

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

  ensureWorkspaceLayout(canvas, nextSize)
  ensureBackgroundLayer(canvas)
  canvas.calcOffset()
  canvas.requestRenderAll()
}
