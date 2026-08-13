import type { Canvas } from 'fabric'
import { getWorkspaceSize } from '@/lib/artboard'
import { ensureBackgroundLayer, isBackgroundObject } from '@/lib/background-layer'
import type { CanvasSize } from '@/lib/canvas-size'
import { WORKSPACE_BG, ensureWorkspaceLayout } from '@/lib/image-sticker'

/**
 * Fabric 래퍼·캔버스에 CSS 표시 크기를 강제한다.
 * cover fit이므로 maxWidth/Height로 클램프하지 않는다 (레터박스 = 비활성 영역이 됨).
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {string} cssWidth - CSS 너비 (px)
 * @param {string} cssHeight - CSS 높이 (px)
 * @param {{ left: number; top: number }} [offset] - 컨테이너 안 중앙 오프셋 (음수 가능)
 * @returns {void}
 */
function applyCanvasCssSize(
  canvas: Canvas,
  cssWidth: string,
  cssHeight: string,
  offset?: { left: number; top: number },
): void {
  const lower = canvas.lowerCanvasEl
  const upper = canvas.upperCanvasEl
  const wrapper = canvas.wrapperEl

  if (wrapper) {
    wrapper.style.position = 'absolute'
    wrapper.style.left = offset ? `${offset.left}px` : '0'
    wrapper.style.top = offset ? `${offset.top}px` : '0'
    wrapper.style.width = cssWidth
    wrapper.style.height = cssHeight
    wrapper.style.maxWidth = 'none'
    wrapper.style.maxHeight = 'none'
    wrapper.style.overflow = 'hidden'
    wrapper.style.boxSizing = 'border-box'
  }

  if (lower) {
    lower.style.width = cssWidth
    lower.style.height = cssHeight
    lower.style.maxWidth = 'none'
  }

  if (upper) {
    upper.style.width = cssWidth
    upper.style.height = cssHeight
    upper.style.maxWidth = 'none'
  }
}

/**
 * 컨테이너에 워크스페이스를 cover 스케일로 맞춘다.
 * 셸 전체가 Fabric 히트 영역이 되어 팬·줌·마퀴가 일러스트 패스트보드처럼 전역에서 동작한다.
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
  // dispose 직후 getter가 undefined를 반환할 수 있음
  if (canvas.disposed || (!canvas.lowerCanvasEl && !canvas.wrapperEl)) {
    return
  }

  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    workspaceWidth <= 0 ||
    workspaceHeight <= 0
  ) {
    return
  }

  // cover: 셸을 가득 채워 레터박스(비히트)를 없앤다. 넘치는 쪽은 overflow로 클립.
  const scale = Math.max(containerWidth / workspaceWidth, containerHeight / workspaceHeight)
  const displayWidth = workspaceWidth * scale
  const displayHeight = workspaceHeight * scale
  const cssWidth = `${displayWidth}px`
  const cssHeight = `${displayHeight}px`
  const offset = {
    left: (containerWidth - displayWidth) / 2,
    top: (containerHeight - displayHeight) / 2,
  }

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
  const wrapper = canvas.wrapperEl

  if (!lower && !wrapper) {
    return
  }

  const cssChanged =
    lower?.style.width !== cssWidth ||
    lower?.style.height !== cssHeight ||
    upper?.style.width !== cssWidth ||
    upper?.style.height !== cssHeight ||
    wrapper?.style.width !== cssWidth ||
    wrapper?.style.height !== cssHeight ||
    wrapper?.style.left !== `${offset.left}px` ||
    wrapper?.style.top !== `${offset.top}px`

  if (cssChanged || needsLogicalReset) {
    try {
      canvas.setDimensions(
        {
          width: cssWidth,
          height: cssHeight,
        },
        { cssOnly: true },
      )
    } catch {
      // dispose 직후 등 — 아래 수동 CSS로 복구
    }
    applyCanvasCssSize(canvas, cssWidth, cssHeight, offset)
    canvas.calcOffset()
    canvas.requestRenderAll()
  } else {
    applyCanvasCssSize(canvas, cssWidth, cssHeight, offset)
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
